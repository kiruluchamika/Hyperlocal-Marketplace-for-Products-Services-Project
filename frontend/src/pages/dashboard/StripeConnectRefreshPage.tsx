import React from 'react';
import { Link } from 'react-router-dom';
import { FiRefreshCw } from 'react-icons/fi';

const StripeConnectRefreshPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <FiRefreshCw size={28} />
        </div>
        <h1 className="text-2xl font-bold text-amber-900">Stripe onboarding needs refresh</h1>
        <p className="mt-2 text-sm text-amber-800">
          The onboarding session expired or was interrupted. Start Stripe Connect onboarding again from your dashboard.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default StripeConnectRefreshPage;
