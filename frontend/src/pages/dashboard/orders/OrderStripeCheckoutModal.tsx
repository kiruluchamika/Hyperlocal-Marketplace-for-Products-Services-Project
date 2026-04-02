import React, { useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import GifLoader from '@/components/ui/GifLoader';
import { formatCurrency } from '@/utils/listings';

interface CheckoutModalProps {
  isOpen: boolean;
  clientSecret: string | null;
  amount: number;
  currency: string;
  onClose: () => void;
  onSuccess: (paymentIntentId?: string) => Promise<void> | void;
}

interface CheckoutFormProps {
  amount: number;
  currency: string;
  onClose: () => void;
  onSuccess: (paymentIntentId?: string) => Promise<void> | void;
}

const stripePublishableKey =
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const CheckoutForm: React.FC<CheckoutFormProps> = ({ amount, currency, onClose, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const amountLabel = useMemo(() => {
    return formatCurrency(amount, currency);
  }, [amount, currency]);

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
    if (status === 'succeeded' || status === 'processing' || status === 'requires_capture') {
      await onSuccess(paymentIntent?.id);
      setIsSubmitting(false);
      onClose();
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

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <span className="font-medium">Payable Amount:</span> {amountLabel}
      </div>

      {submitError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || isSubmitting}
          className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-primary-500/20 hover:from-primary-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Processing...' : 'Confirm Payment'}
        </button>
      </div>
    </form>
  );
};

const OrderStripeCheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  clientSecret,
  amount,
  currency,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Stripe Checkout</h3>
            <p className="mt-1 text-sm text-slate-500">Complete your order payment in test mode.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close payment modal"
          >
            ✕
          </button>
        </div>

        {!stripePromise && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Missing Stripe publishable key. Add VITE_STRIPE_PUBLISHABLE_KEY to frontend .env and restart Vite.
          </div>
        )}

        {stripePromise && !clientSecret && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <GifLoader size="xs" />
            Preparing secure checkout...
          </div>
        )}

        {stripePromise && clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#7c3aed',
                  borderRadius: '10px',
                },
              },
            }}
          >
            <CheckoutForm amount={amount} currency={currency} onClose={onClose} onSuccess={onSuccess} />
          </Elements>
        )}
      </div>
    </div>
  );
};

export default OrderStripeCheckoutModal;
