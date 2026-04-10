import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiMapPin,
} from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { bookingsApi, servicesApi } from '@/api/services';
import { paymentsApi } from '@/api/payments';
import { IServiceBooking, IServiceSelling } from '@/types';
import { formatCurrency } from '@/utils/listings';
import { useSiteSettingsStore } from '@/store/siteSettingsStore';

type PaymentState = {
  clientSecret: string;
  amount: number;
  currency: string;
  paymentIntentId?: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat('en-LK', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const getServiceId = (service: IServiceBooking['serviceId']) =>
  typeof service === 'string' ? service : service?._id || '';

const getServiceTitle = (booking: IServiceBooking, service: IServiceSelling | null) => {
  if (typeof booking.serviceId === 'object') {
    return booking.serviceId?.title || 'Service booking';
  }

  return service?.title || 'Service booking';
};

const getServiceLocation = (booking: IServiceBooking, service: IServiceSelling | null) => {
  if (typeof booking.serviceId === 'object') {
    return booking.serviceId?.locationText || booking.serviceId?.location?.city || 'Location unavailable';
  }

  return service?.locationText || service?.location?.city || 'Location unavailable';
};

const getProviderName = (booking: IServiceBooking) => {
  if (typeof booking.providerId === 'object') {
    return booking.providerId?.name || 'Provider';
  }

  return `Provider ID: ${booking.providerId}`;
};

const PaymentCheckoutForm: React.FC<{
  amount: number;
  currency: string;
  onSuccess: (paymentIntentId: string) => Promise<void> | void;
}> = ({ amount, currency, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setSubmitError('Stripe is still loading. Please wait a moment and try again.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setSubmitError(error.message || 'Payment failed. Please try again.');
      setIsSubmitting(false);
      return;
    }

    const status = paymentIntent?.status;
    if (
      paymentIntent?.id &&
      (status === 'succeeded' || status === 'processing' || status === 'requires_capture')
    ) {
      await onSuccess(paymentIntent.id);
      setIsSubmitting(false);
      return;
    }

    setSubmitError('Payment did not complete. Please try again.');
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        Test Mode: Use card number 4242 4242 4242 4242, any future date, any CVC, any ZIP.
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-sm text-slate-700">
        <span className="font-medium">Payable Amount:</span> {formatCurrency(amount, currency.toUpperCase())}
      </div>

      {submitError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <Button type="submit" className="w-full" leftIcon={<FiCreditCard size={16} />} disabled={!stripe || !elements} isLoading={isSubmitting}>
        Confirm Payment
      </Button>
    </form>
  );
};

const ServiceBookingPaymentPage: React.FC = () => {
  const { bookingId = '' } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = React.useState<IServiceBooking | null>(null);
  const [service, setService] = React.useState<IServiceSelling | null>(null);
  const [paymentState, setPaymentState] = React.useState<PaymentState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [paymentReady, setPaymentReady] = React.useState(false);
  const [publishableKey, setPublishableKey] = React.useState(
    (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? ''
  );
  const [paymentConfigError, setPaymentConfigError] = React.useState('');
  const runtimeSettings = useSiteSettingsStore((state) => state.settings);

  const stripePromise = React.useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  const fetchBooking = React.useCallback(async () => {
    const { data } = await bookingsApi.getMyBookings();
    const nextBooking = (data.data || []).find((item) => item._id === bookingId) || null;
    setBooking(nextBooking);
    return nextBooking;
  }, [bookingId]);

  React.useEffect(() => {
    if (publishableKey) {
      return;
    }

    const loadStripeConfig = async () => {
      try {
        const { data } = await paymentsApi.getConfig();
        setPublishableKey(data.data.publishableKey || '');
      } catch {
        setPaymentConfigError('Unable to load the secure payment configuration right now.');
      }
    };

    void loadStripeConfig();
  }, [publishableKey]);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const nextBooking = await fetchBooking();

        if (!nextBooking) {
          toast.error('Booking not found.');
          navigate('/dashboard/service-requests', { replace: true });
          return;
        }

        const serviceId = getServiceId(nextBooking.serviceId);
        if (serviceId) {
          try {
            const serviceResponse = await servicesApi.getById(serviceId);
            setService(serviceResponse.data.data);
          } catch {
            setService(null);
          }
        }

        if (nextBooking.status === 'CONFIRMED') {
          setPaymentReady(false);
          return;
        }

        if (nextBooking.status !== 'PROVIDER_ACCEPTED') {
          toast.error('This booking is not ready for payment.');
          navigate('/dashboard/service-requests', { replace: true });
          return;
        }

        if (!runtimeSettings.paymentsEnabled) {
          setPaymentReady(false);
          setPaymentConfigError(runtimeSettings.paymentsDisabledMessage);
          return;
        }

        const depositResponse = await bookingsApi.initiateDeposit(bookingId);
        setPaymentState({
          clientSecret: depositResponse.data.data.clientSecret,
          amount: depositResponse.data.data.amount,
          currency: depositResponse.data.data.currency,
          paymentIntentId: depositResponse.data.data.paymentIntentId,
        });
        setPaymentReady(true);
      } catch {
        toast.error('Unable to prepare payment for this service booking.');
        navigate('/dashboard/service-requests', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [bookingId, fetchBooking, navigate, runtimeSettings.paymentsDisabledMessage, runtimeSettings.paymentsEnabled]);

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    await bookingsApi.confirmDeposit(bookingId, paymentIntentId);
    toast.success('Payment completed and booking confirmed.');
    await fetchBooking();
    navigate('/dashboard/service-requests', { replace: true });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-card">
          Preparing your service booking payment...
        </div>
      </div>
    );
  }

  if (!booking) return null;

  if (booking.isSlotTaken) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-amber-200 bg-white p-8 shadow-card">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <FiCalendar size={22} />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-slate-800">Booking Slot Unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">
            This slot was taken by another user who paid first and the slot is not available anymore. Please make another request.
          </p>
          <div className="mt-6 flex gap-4">
            <Link to="/dashboard/service-requests" className="btn-secondary inline-flex items-center gap-2">
              <FiArrowLeft size={16} />
              Back to My Requests
            </Link>
            <Link to={`/services/${typeof booking.serviceId === 'object' ? booking.serviceId._id : booking.serviceId}`} className="btn-primary inline-flex items-center gap-2">
              Make Another Request
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (booking.status === 'CONFIRMED') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-card">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <FiCheckCircle size={22} />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-slate-800">Booking Already Confirmed</h1>
          <p className="mt-2 text-sm text-slate-500">
            This service booking is already confirmed, so no further payment is needed.
          </p>
          <div className="mt-6">
            <Link to="/dashboard/service-requests" className="btn-secondary inline-flex items-center gap-2">
              <FiArrowLeft size={16} />
              Back to My Service Booking
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link to="/dashboard/service-requests" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-800">
          <FiArrowLeft size={16} />
          Back to My Service Booking
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Service Booking Payment</h1>
        <p className="mt-2 text-sm text-slate-500">
          Review the accepted booking and complete the deposit to confirm the slot.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">PROVIDER_ACCEPTED</Badge>
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  Booking #{booking._id.slice(-6)}
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-800">{getServiceTitle(booking, service)}</h2>
              <p className="mt-1 text-sm text-slate-500">{getProviderName(booking)}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Booked Date & Time</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <FiCalendar size={14} />
                {dateTimeFormatter.format(new Date(booking.startAt))}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Duration</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <FiClock size={14} />
                {booking.durationMinutes} minutes
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Location</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <FiMapPin size={14} />
                {getServiceLocation(booking, service)}
              </p>
            </div>
          </div>

          {booking.note && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Your Note</p>
              <p className="mt-2 text-sm text-slate-700">{booking.note}</p>
            </div>
          )}
        </div>

        <div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <h3 className="text-xl font-semibold text-slate-800">Deposit Payment</h3>
            <p className="mt-2 text-sm text-slate-500">The deposit amount below is calculated automatically for this booking.</p>

            {paymentState && (
              <div className="mt-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-violet-50 to-white p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-600">Payable Deposit</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {formatCurrency(paymentState.amount, paymentState.currency.toUpperCase())}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {service?.pricingType === 'HOURLY'
                    ? 'Hourly services use the full hourly price as the deposit.'
                    : 'Fixed-price services use 20% of the service price as the deposit.'}
                </p>
              </div>
            )}

            {paymentConfigError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {paymentConfigError}
              </div>
            )}

            {!stripePromise && !paymentConfigError && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Loading secure payment form...
              </div>
            )}

            {stripePromise && paymentReady && paymentState && (
              <div className="mt-4">
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: paymentState.clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#7c3aed',
                        borderRadius: '10px',
                      },
                    },
                  }}
                >
                  <PaymentCheckoutForm
                    amount={paymentState.amount}
                    currency={paymentState.currency}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceBookingPaymentPage;
