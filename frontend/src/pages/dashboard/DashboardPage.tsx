import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiPackage,
  FiShoppingBag,
  FiBookOpen,
  FiBell,
  FiUser,
  FiPlus,
  FiClock,
  FiActivity,
  FiCreditCard,
  FiExternalLink,
  FiRefreshCw,
} from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { listingsApi } from '@/api/listings';
import { ordersApi } from '@/api/orders';
import { servicesApi, bookingsApi } from '@/api/services';
import { usersApi, type StripeConnectBalance, type StripeConnectStatus } from '@/api/users';
import toast from 'react-hot-toast';

interface DashboardStats {
  activeListings: number;
  activeServices: number;
  totalOrders: number;
  totalBookings: number;
}

const DashboardPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  
  const [stats, setStats] = useState<DashboardStats>({
    activeListings: 0,
    activeServices: 0,
    totalOrders: 0,
    totalBookings: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [connectBalance, setConnectBalance] = useState<StripeConnectBalance | null>(null);
  const [isLoadingConnect, setIsLoadingConnect] = useState(true);
  const [isCreatingConnectLink, setIsCreatingConnectLink] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        const [listingsRes, servicesRes, ordersRes, bookingsRes] = await Promise.allSettled([
          listingsApi.getMyActive(),
          servicesApi.getMyServices(),
          ordersApi.getAll({ limit: 1 }), // Minimizing payload if possible
          bookingsApi.getMyBookings(),
        ]);

        let listingsCount = 0;
        let servicesCount = 0;
        let ordersCount = 0;
        let bookingsCount = 0;

        if (listingsRes.status === 'fulfilled') {
          listingsCount = listingsRes.value.data.data?.length || 0;
        }
        if (servicesRes.status === 'fulfilled') {
          servicesCount = servicesRes.value.data.data?.length || 0;
        }
        if (ordersRes.status === 'fulfilled') {
          ordersCount = ordersRes.value.data.pagination?.total || ordersRes.value.data.orders?.length || 0;
        }
        if (bookingsRes.status === 'fulfilled') {
          bookingsCount = bookingsRes.value.data.data?.length || 0;
        }

        setStats({
          activeListings: listingsCount,
          activeServices: servicesCount,
          totalOrders: ordersCount,
          totalBookings: bookingsCount,
        });
      } catch (error) {
        console.error('Failed to load dashboard stats', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    void fetchStats();
  }, []);

  useEffect(() => {
    const fetchConnectStatus = async () => {
      setIsLoadingConnect(true);
      try {
        const [statusResponse, balanceResponse] = await Promise.all([
          usersApi.getStripeConnectStatus(),
          usersApi.getStripeConnectBalance(),
        ]);

        setConnectStatus(statusResponse.data.data);
        setConnectBalance(balanceResponse.data.data);
      } catch {
        setConnectStatus(null);
        setConnectBalance(null);
      } finally {
        setIsLoadingConnect(false);
      }
    };

    void fetchConnectStatus();
  }, []);

  useEffect(() => {
    const refreshConnect = () => {
      void (async () => {
        setIsLoadingConnect(true);
        try {
          const [statusResponse, balanceResponse] = await Promise.all([
            usersApi.getStripeConnectStatus(),
            usersApi.getStripeConnectBalance(),
          ]);

          setConnectStatus(statusResponse.data.data);
          setConnectBalance(balanceResponse.data.data);
        } catch {
          setConnectStatus(null);
          setConnectBalance(null);
        } finally {
          setIsLoadingConnect(false);
        }
      })();
    };

    window.addEventListener('focus', refreshConnect);
    document.addEventListener('visibilitychange', refreshConnect);

    return () => {
      window.removeEventListener('focus', refreshConnect);
      document.removeEventListener('visibilitychange', refreshConnect);
    };
  }, []);

  const refreshConnectStatus = async () => {
    setIsLoadingConnect(true);
    try {
      const [statusResponse, balanceResponse] = await Promise.all([
        usersApi.getStripeConnectStatus(),
        usersApi.getStripeConnectBalance(),
      ]);

      setConnectStatus(statusResponse.data.data);
      setConnectBalance(balanceResponse.data.data);
      toast.success('Payout account status refreshed');
    } catch {
      toast.error('Unable to refresh payout account status');
    } finally {
      setIsLoadingConnect(false);
    }
  };

  const startConnectOnboarding = async () => {
    setIsCreatingConnectLink(true);
    try {
      const response = await usersApi.createStripeConnectOnboarding({
        returnUrl: `${window.location.origin}/dashboard/payouts/connect-callback`,
        refreshUrl: `${window.location.origin}/dashboard/payouts/connect-refresh`,
      });

      const onboardingUrl = response.data.data.onboardingUrl;
      if (!onboardingUrl) {
        throw new Error('No onboarding URL was returned');
      }

      window.location.href = onboardingUrl;
    } catch (error) {
      console.error('Stripe onboarding failed', error);
    } finally {
      setIsCreatingConnectLink(false);
    }
  };

  const statusLabel = connectStatus?.status || 'NOT_STARTED';
  const availableTotal = (connectBalance?.available || []).reduce((sum, item) => sum + item.amount, 0);
  const pendingTotal = (connectBalance?.pending || []).reduce((sum, item) => sum + item.amount, 0);
  const primaryCurrency = connectBalance?.available?.[0]?.currency || connectBalance?.pending?.[0]?.currency || 'LKR';

  const formatBalance = (value: number) =>
    `${primaryCurrency.toUpperCase()} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const isConnectReady =
    connectStatus?.status === 'COMPLETED' &&
    connectStatus?.chargesEnabled &&
    connectStatus?.payoutsEnabled;

  const connectStatusPillClass = isConnectReady
    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : statusLabel === 'IN_PROGRESS'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : statusLabel === 'VERIFICATION_FAILED'
        ? 'bg-rose-100 text-rose-800 border-rose-200'
        : 'bg-slate-100 text-slate-700 border-slate-200';

  const actionCards = [
    { title: 'My Listings', description: 'Manage your products for sale.', icon: FiPackage, to: '/dashboard/listings', color: 'bg-indigo-50 text-indigo-600' },
    { title: 'My Services', description: 'Manage your professional services.', icon: FiBookOpen, to: '/dashboard/services', color: 'bg-blue-50 text-blue-600' },
    { title: 'My Orders', description: 'Track your pending purchases.', icon: FiShoppingBag, to: '/dashboard/orders', color: 'bg-emerald-50 text-emerald-600' },
    { title: 'Notifications', description: 'Check alerts & messages.', icon: FiBell, to: '/dashboard/notifications', color: 'bg-amber-50 text-amber-600' },
    { title: 'Profile Settings', description: 'Update account details.', icon: FiUser, to: '/dashboard/profile', color: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 xl:py-10">
      
      <div className="relative overflow-hidden mb-8 sm:mb-12 rounded-[32px] bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 p-8 sm:p-10 shadow-xl shadow-indigo-900/20">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl mix-blend-screen pointer-events-none"></div>
        
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between z-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="mt-3 text-indigo-100/90 text-[15px] sm:text-base max-w-xl leading-relaxed">
              Your quick overview of ongoing activity. Access your listings, manage orders, or track new notifications directly from here.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0 md:mt-0 mt-2">
            <Link to="/dashboard/listings/create" className="flex items-center justify-center gap-2 rounded-[14px] bg-white px-5 py-3.5 text-sm font-semibold text-indigo-700 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:shadow-lg hover:shadow-white/10 hover:scale-[1.02]">
              <FiPlus size={18} strokeWidth={2.5} /> Post a Product
            </Link>
            <Link to="/dashboard/services/create" className="flex items-center justify-center gap-2 rounded-[14px] bg-indigo-700/50 border border-indigo-400/30 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700/80 hover:shadow-lg hover:shadow-indigo-900/40 backdrop-blur-sm">
              <FiPlus size={18} strokeWidth={2.5} /> Offer a Service
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-lg font-bold mb-4 px-1 flex items-center gap-2 text-slate-900">
          <FiActivity className="text-indigo-600" /> Performance Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StatCard title="Active Listings" value={stats.activeListings} icon={FiPackage} loading={isLoadingStats} color="text-indigo-600" />
          <StatCard title="Active Services" value={stats.activeServices} icon={FiBookOpen} loading={isLoadingStats} color="text-blue-600" />
          <StatCard title="Product Orders" value={stats.totalOrders} icon={FiShoppingBag} loading={isLoadingStats} color="text-emerald-600" />
          <StatCard title="Service Bookings" value={stats.totalBookings} icon={FiClock} loading={isLoadingStats} color="text-amber-600" />
        </div>
      </div>

      <div className="mb-12 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiCreditCard className="text-indigo-600" /> Payout Account
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Connect your Stripe payout account to receive product and service earnings automatically.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshConnectStatus()}
              disabled={isLoadingConnect}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <FiRefreshCw /> Refresh
            </button>
            <button
              type="button"
              onClick={() => void startConnectOnboarding()}
              disabled={isCreatingConnectLink}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <FiExternalLink /> {isCreatingConnectLink ? 'Opening...' : 'Connect Stripe'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Onboarding Status</div>
            <div className="mt-2">
              {isLoadingConnect ? (
                <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200" />
              ) : (
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${connectStatusPillClass}`}>
                  {statusLabel}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Charges Enabled</div>
            <div className="mt-2 text-sm font-semibold text-slate-800">
              {isLoadingConnect ? 'Loading...' : connectStatus?.chargesEnabled ? 'Yes' : 'No'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Payouts Enabled</div>
            <div className="mt-2 text-sm font-semibold text-slate-800">
              {isLoadingConnect ? 'Loading...' : connectStatus?.payoutsEnabled ? 'Yes' : 'No'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Available Balance</div>
            <div className="mt-2 text-sm font-semibold text-slate-800">
              {isLoadingConnect ? 'Loading...' : formatBalance(availableTotal)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Pending Balance</div>
            <div className="mt-2 text-sm font-semibold text-slate-800">
              {isLoadingConnect ? 'Loading...' : formatBalance(pendingTotal)}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          {isConnectReady
            ? 'Payout account is ready. New released earnings can transfer automatically.'
            : 'Payout account is not fully ready yet. Earnings can complete in app but transfer may be marked as skipped/failed until onboarding is complete.'}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-4 px-1 text-slate-900">Manage Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {actionCards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="group flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50"
            >
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${card.color} group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300`}>
                <card.icon size={22} strokeWidth={2.5} />
              </div>
              <div className="mt-1">
                <h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-indigo-700 transition-colors">{card.title}</h3>
                <p className="text-[13px] font-medium text-slate-500 line-clamp-2 leading-relaxed">{card.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number | string; icon: any; loading: boolean, color: string }> = ({ title, value, icon: Icon, loading, color }) => (
  <div className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm hover:shadow-md transition-all">
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase">{title}</p>
      {loading ? (
        <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-100 mt-1" />
      ) : (
        <p className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      )}
    </div>
    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 ${color} shadow-sm`}>
      <Icon size={22} strokeWidth={2.5} />
    </div>
  </div>
);

export default DashboardPage;
