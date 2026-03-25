import React from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiShoppingBag, FiBookOpen, FiBell, FiUser } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';

const DashboardPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  const quickLinks = [
    { to: '/dashboard/listings', icon: FiPackage, label: 'My Listings', color: 'bg-primary-50 text-primary-600' },
    { to: '/dashboard/orders', icon: FiShoppingBag, label: 'My Orders', color: 'bg-emerald-50 text-emerald-600' },
    { to: '/dashboard/services', icon: FiBookOpen, label: 'My Services', color: 'bg-blue-50 text-blue-600' },
    { to: '/dashboard/notifications', icon: FiBell, label: 'Notifications', color: 'bg-amber-50 text-amber-600' },
    { to: '/dashboard/profile', icon: FiUser, label: 'Profile', color: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Welcome back, <span className="gradient-text">{user?.name || 'User'}</span>
        </h1>
        <p className="text-slate-500 mt-1">Manage your marketplace activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 group"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${link.color} group-hover:scale-110 transition-transform`}>
              <link.icon className="h-5 w-5" />
            </div>
            <span className="font-semibold text-slate-700">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
