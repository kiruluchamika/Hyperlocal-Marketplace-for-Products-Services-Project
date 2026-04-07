import React from 'react';
import { Link } from 'react-router-dom';
import { FiFileText } from 'react-icons/fi';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-500 shadow-sm">
        <FiFileText size={48} />
      </div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
        Page Not Found
      </h1>
      <p className="mx-auto mb-8 max-w-md text-base text-slate-500 sm:text-lg">
        We couldn't find the page you're looking for. It might have been moved or deleted.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow"
      >
        Go Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
