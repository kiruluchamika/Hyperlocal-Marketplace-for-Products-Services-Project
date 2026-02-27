import React from 'react';
import { Link } from 'react-router-dom';

const BrowseServicesPage: React.FC = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Browse Services</h1>
        <p className="text-slate-500 mb-8">Find professional services in your area. Coming soon.</p>
        <Link to="/" className="btn-secondary inline-block">
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
};

export default BrowseServicesPage;
