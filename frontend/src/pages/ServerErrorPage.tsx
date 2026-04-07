import React from 'react';
import { useNavigate, useRouteError } from 'react-router-dom';
import { FiAlertTriangle } from 'react-icons/fi';

const ServerErrorPage: React.FC = () => {
  const navigate = useNavigate();
  const error = useRouteError();
  
  // Log the error nicely in development without breaking the clean UI
  if (import.meta.env.DEV && error) {
    console.error('Captured by Error Boundary:', error);
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-rose-50 text-rose-500 shadow-sm">
        <FiAlertTriangle size={48} />
      </div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mx-auto mb-8 max-w-md text-base text-slate-500 sm:text-lg">
        An unexpected error occurred on our side. Please try again in a moment.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow"
        >
          Retry
        </button>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default ServerErrorPage;
