import React from 'react';
import toast from 'react-hot-toast';
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiMapPin,
  FiXCircle,
} from 'react-icons/fi';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { bookingsApi, servicesApi } from '@/api/services';
import { BookingStatus, IServiceBooking, IServiceSelling } from '@/types';
import { formatCurrency } from '@/utils/listings';

type RequestSection = 'active' | 'history';

type DepositPreview = {
  amount: number;
  currency: string;
  clientSecret: string;
  paymentIntentId?: string;
};

const ACTIVE_STATUSES: BookingStatus[] = ['PENDING', 'PROVIDER_ACCEPTED', 'CONFIRMED'];
const HISTORY_STATUSES: BookingStatus[] = ['CONFIRMED', 'REJECTED', 'CANCELLED'];

const dateTimeFormatter = new Intl.DateTimeFormat('en-LK', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const getServiceId = (service: IServiceBooking['serviceId']) =>
  typeof service === 'string' ? service : service?._id || '';

const getServiceTitle = (booking: IServiceBooking, servicesById: Record<string, IServiceSelling>) => {
  if (typeof booking.serviceId === 'object') {
    return booking.serviceId?.title || 'Service request';
  }

  return servicesById[booking.serviceId]?.title || 'Service request';
};

const getServiceLocation = (booking: IServiceBooking, servicesById: Record<string, IServiceSelling>) => {
  if (typeof booking.serviceId === 'object') {
    return booking.serviceId?.locationText || booking.serviceId?.location?.city || 'Location unavailable';
  }

  const service = servicesById[booking.serviceId];
  return service?.locationText || service?.location?.city || 'Location unavailable';
};

const getProviderName = (booking: IServiceBooking) => {
  if (typeof booking.providerId === 'object') {
    return booking.providerId?.name || 'Provider';
  }

  return `Provider ID: ${booking.providerId}`;
};

const getStatusBadge = (status: BookingStatus) => {
  if (status === 'PENDING') return <Badge variant="warning">PENDING</Badge>;
  if (status === 'PROVIDER_ACCEPTED') return <Badge variant="info">PROVIDER_ACCEPTED</Badge>;
  if (status === 'CONFIRMED') return <Badge variant="success">CONFIRMED</Badge>;
  return <Badge variant="danger">{status}</Badge>;
};

const getStatusMessage = (booking: IServiceBooking) => {
  if (booking.status === 'PENDING') {
    return 'Waiting for provider response';
  }

  if (booking.status === 'PROVIDER_ACCEPTED') {
    return 'Provider accepted this request. Pay the deposit to confirm the booking.';
  }

  if (booking.status === 'CONFIRMED') {
    return booking.deposit?.paidAt
      ? `Deposit paid on ${dateTimeFormatter.format(new Date(booking.deposit.paidAt))}`
      : 'Booking confirmed successfully.';
  }

  if (booking.status === 'REJECTED') {
    return 'This request was rejected by the provider.';
  }

  return 'This request was cancelled.';
};

const MyServiceRequestsPage: React.FC = () => {
  const [section, setSection] = React.useState<RequestSection>('active');
  const [bookings, setBookings] = React.useState<IServiceBooking[]>([]);
  const [servicesById, setServicesById] = React.useState<Record<string, IServiceSelling>>({});
  const [loading, setLoading] = React.useState(true);
  const [payingId, setPayingId] = React.useState('');
  const [depositPreviewById, setDepositPreviewById] = React.useState<Record<string, DepositPreview>>({});

  const fetchBookings = React.useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await bookingsApi.getMyBookings();
      const bookingItems = data.data || [];
      setBookings(bookingItems);

      const serviceIds = Array.from(
        new Set(
          bookingItems
            .map((booking) => getServiceId(booking.serviceId))
            .filter(Boolean)
        )
      );

      const serviceResponses = await Promise.allSettled(serviceIds.map((id) => servicesApi.getById(id)));
      const resolvedServices = serviceResponses.reduce<Record<string, IServiceSelling>>((result, response) => {
        if (response.status === 'fulfilled') {
          const service = response.value.data.data;
          result[service._id] = service;
        }
        return result;
      }, {});

      setServicesById(resolvedServices);
    } catch {
      setBookings([]);
      setServicesById({});
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const activeRequests = React.useMemo(
    () => bookings.filter((booking) => ACTIVE_STATUSES.includes(booking.status)),
    [bookings]
  );

  const historyRequests = React.useMemo(
    () => bookings.filter((booking) => HISTORY_STATUSES.includes(booking.status)),
    [bookings]
  );

  const visibleRequests = section === 'active' ? activeRequests : historyRequests;

  const handlePayNow = async (bookingId: string) => {
    try {
      setPayingId(bookingId);
      const { data } = await bookingsApi.initiateDeposit(bookingId);
      setDepositPreviewById((prev) => ({
        ...prev,
        [bookingId]: {
          amount: data.data.amount,
          currency: data.data.currency,
          clientSecret: data.data.clientSecret,
          paymentIntentId: data.data.paymentIntentId,
        },
      }));
      toast.success('Deposit payment is ready for this booking.');
    } catch {
      // global toast
    } finally {
      setPayingId('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Service Requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track the service bookings you created as a buyer, including active requests and past request history.
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-sm text-slate-500">Active Requests</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{loading ? '...' : activeRequests.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-sm text-slate-500">History</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{loading ? '...' : historyRequests.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-sm text-slate-500">Confirmed Requests</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">
            {loading ? '...' : bookings.filter((booking) => booking.status === 'CONFIRMED').length}
          </p>
        </div>
      </div>

      <div className="mb-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-card">
        <button
          type="button"
          onClick={() => setSection('active')}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            section === 'active' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active Requests
        </button>
        <button
          type="button"
          onClick={() => setSection('history')}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            section === 'history' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          History
        </button>
      </div>

      {loading && (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading your service requests...
        </p>
      )}

      {!loading && visibleRequests.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">
            {section === 'active' ? 'No active service requests' : 'No service request history'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {section === 'active'
              ? 'When you request a booking on a service ad, it will appear here while it is active.'
              : 'Confirmed, rejected, and cancelled service requests will appear here over time.'}
          </p>
        </div>
      )}

      {!loading && visibleRequests.length > 0 && (
        <div className="space-y-4">
          {visibleRequests.map((booking) => {
            const serviceTitle = getServiceTitle(booking, servicesById);
            const depositPreview = depositPreviewById[booking._id];

            return (
              <div key={booking._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(booking.status)}
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        Request #{booking._id.slice(-6)}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-slate-800">{serviceTitle}</h2>
                    <p className="mt-1 text-sm text-slate-500">{getProviderName(booking)}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-500">Current Status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{booking.status}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                      {getServiceLocation(booking, servicesById)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-primary-50/50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary-600">Request Status</p>
                  <p className="mt-2 text-sm text-slate-700">{getStatusMessage(booking)}</p>
                </div>

                {booking.note && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Your Note</p>
                    <p className="mt-2 text-sm text-slate-700">{booking.note}</p>
                  </div>
                )}

                {booking.status === 'CONFIRMED' && booking.deposit && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <p className="inline-flex items-center gap-2 font-semibold">
                      <FiCheckCircle size={14} /> Deposit confirmed
                    </p>
                    <p className="mt-2">
                      {formatCurrency(booking.deposit.amount, booking.deposit.currency.toUpperCase())}
                      {booking.deposit.paidAt ? ` paid on ${dateTimeFormatter.format(new Date(booking.deposit.paidAt))}` : ''}
                    </p>
                  </div>
                )}

                {booking.status === 'REJECTED' && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <p className="inline-flex items-center gap-2 font-semibold">
                      <FiXCircle size={14} /> Rejected
                    </p>
                    <p className="mt-2">This request is closed and no further action is available.</p>
                  </div>
                )}

                {booking.status === 'CANCELLED' && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="inline-flex items-center gap-2 font-semibold">
                      <FiXCircle size={14} /> Cancelled
                    </p>
                    <p className="mt-2">This request was cancelled and is now part of your history.</p>
                  </div>
                )}

                {booking.status === 'PROVIDER_ACCEPTED' && (
                  <div className="mt-4 space-y-3">
                    <Button
                      type="button"
                      size="sm"
                      leftIcon={<FiCreditCard size={14} />}
                      isLoading={payingId === booking._id}
                      onClick={() => void handlePayNow(booking._id)}
                    >
                      Pay Now
                    </Button>

                    {depositPreview && (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-sm text-slate-700">
                        <p className="font-semibold text-slate-800">Deposit payment ready</p>
                        <p className="mt-2">
                          Amount: {formatCurrency(depositPreview.amount, depositPreview.currency.toUpperCase())}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Payment intent prepared for this booking. Client secret has been received for the next payment step.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyServiceRequestsPage;
