import React from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle } from 'react-icons/fi';

const StripeConnectCallbackPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <FiCheckCircle size={28} />
        </div>
        <h1 className="text-2xl font-bold text-emerald-900">Stripe onboarding complete</h1>
        <p className="mt-2 text-sm text-emerald-800">
          Your payout account setup has been submitted. Return to dashboard and refresh payout status.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default StripeConnectCallbackPage;
