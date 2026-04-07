import React, { useEffect, useState } from 'react';
import {
  FiAward,
  FiBriefcase,
  FiChevronDown,
  FiCreditCard,
  FiLayers,
  FiMessageSquare,
  FiPackage,
  FiSearch,
  FiShield,
  FiShoppingCart,
  FiStar,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { adminApi } from '@/api/admin';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminBadge, { getStatusVariant } from '@/components/admin/AdminBadge';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import FullPageLoader from '@/components/ui/FullPageLoader';
import type { DashboardData, ChartData } from '@/types/admin';
import { format } from 'date-fns';

const derivePercentChange = (values: number[]) => {
  if (values.length < 2) return null;

  const previous = values[values.length - 2];
  const current = values[values.length - 1];

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Math.round(((current - previous) / previous) * 100);
};

const getSeriesTrend = (
  values: number[],
  fallbackTrend: { value: number; label: string },
) => {
  const calculatedChange = derivePercentChange(values);

  return {
    value: calculatedChange ?? fallbackTrend.value,
    label: calculatedChange === null ? fallbackTrend.label : 'vs last month',
  };
};

const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, chartsRes] = await Promise.all([
          adminApi.getStats(),
          adminApi.getChartData(),
        ]);
        setData(statsRes.data);
        setCharts(chartsRes.data);
      } catch {
        // handled by global error interceptor
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <FullPageLoader label="Loading dashboard..." />;
  }

  if (!data) return null;

  const { stats, recentUsers, recentOrders, ordersByStatus, userGrowth, performance } = data;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredRecentUsers = recentUsers.filter((user) => {
    if (!normalizedSearchQuery) return true;

    return [user.name, user.email, user.role]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearchQuery));
  });

  const filteredRecentOrders = recentOrders.filter((order) => {
    if (!normalizedSearchQuery) return true;

    return [order.titleSnapshot, order.buyerId?.name, order.sellerId?.name]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearchQuery));
  });

  const placeholderServiceTrend = { value: 8, label: 'vs last period' };
  const placeholderCategoryTrend = { value: -2, label: 'vs last period' };
  const placeholderReviewTrend = { value: 6, label: 'vs last period' };
  const placeholderHiddenTrend = { value: -1, label: 'vs last period' };
  const placeholderRatingTrend = { value: 4, label: 'vs last period' };

  const statTrends = {
    totalUsers: getSeriesTrend(
      userGrowth.map((item) => item.count),
      { value: 12, label: 'vs last period' },
    ),
    totalProducts: getSeriesTrend(
      (charts?.listingsByMonth ?? []).map((item) => item.count),
      { value: 9, label: 'vs last period' },
    ),
    totalServices: placeholderServiceTrend,
    totalOrders: getSeriesTrend(
      (charts?.ordersByMonth ?? []).map((item) => item.count),
      { value: 11, label: 'vs last period' },
    ),
    totalRevenue: getSeriesTrend(
      (charts?.revenueByMonth ?? []).map((item) => item.revenue),
      { value: 14, label: 'vs last period' },
    ),
    totalCategories: placeholderCategoryTrend,
    totalReviews: getSeriesTrend(
      (charts?.reviewsByMonth ?? []).map((item) => item.count),
      placeholderReviewTrend,
    ),
    hiddenReviewRatio: placeholderHiddenTrend,
    averageServiceRating: getSeriesTrend(
      (charts?.reviewsByMonth ?? []).map((item) => item.avgRating),
      placeholderRatingTrend,
    ),
  };

  const topSellingProduct = performance?.topSellingProduct ?? null;
  const mostActiveUser = performance?.mostActiveUser ?? null;
  const topCategory = performance?.topCategory ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-slate-600">
            Welcome back! Here&apos;s what&apos;s happening with your marketplace.
          </p>
        </div>
        <div className="w-full max-w-md">
          <AdminSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search users, products..."
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9">
        <AdminStatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={<FiUsers size={22} />}
          color="blue"
          trend={statTrends.totalUsers}
        />
        <AdminStatCard
          title="Products"
          value={stats.totalProducts.toLocaleString()}
          icon={<FiPackage size={22} />}
          color="emerald"
          trend={statTrends.totalProducts}
        />
        <AdminStatCard
          title="Services"
          value={stats.totalServices.toLocaleString()}
          icon={<FiBriefcase size={22} />}
          color="violet"
          trend={statTrends.totalServices}
        />
        <AdminStatCard
          title="Orders"
          value={stats.totalOrders.toLocaleString()}
          icon={<FiShoppingCart size={22} />}
          color="amber"
          trend={statTrends.totalOrders}
        />
        <AdminStatCard
          title="Revenue"
          value={`Rs. ${stats.totalRevenue.toLocaleString()}`}
          icon={<FiCreditCard size={22} />}
          color="cyan"
          trend={statTrends.totalRevenue}
        />
        <AdminStatCard
          title="Categories"
          value={stats.totalCategories.toLocaleString()}
          icon={<FiLayers size={22} />}
          color="rose"
          trend={statTrends.totalCategories}
        />
        <AdminStatCard
          title="Total Reviews"
          value={stats.totalReviews.toLocaleString()}
          icon={<FiMessageSquare size={22} />}
          color="blue"
          trend={statTrends.totalReviews}
        />
        <AdminStatCard
          title="Hidden Ratio"
          value={`${stats.hiddenReviewRatio.toFixed(1)}%`}
          icon={<FiShield size={22} />}
          color="rose"
          trend={statTrends.hiddenReviewRatio}
        />
        <AdminStatCard
          title="Avg Rating"
          value={stats.averageServiceRating.toFixed(1)}
          icon={<FiStar size={22} />}
          color="amber"
          trend={statTrends.averageServiceRating}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Analytics</h2>
            <p className="mt-1 text-xs text-slate-500">
              Expand to view the detailed dashboard charts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAnalyticsVisible((current) => !current)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white hover:text-slate-900"
          >
            {analyticsVisible ? 'Hide Analytics' : 'Show Analytics'}
            <FiChevronDown
              size={16}
              className={`transition-transform duration-300 ${analyticsVisible ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {analyticsVisible && (
            <motion.div
              key="dashboard-analytics"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="mb-4 text-sm font-semibold text-slate-700">Revenue Trend</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={charts?.revenueByMonth ?? []}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            color: '#0f172a',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#revGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="mb-4 text-sm font-semibold text-slate-700">Monthly Orders</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={charts?.ordersByMonth ?? []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            color: '#0f172a',
                          }}
                        />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 text-sm font-semibold text-slate-700">Average Rating Trend</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={charts?.reviewsByMonth ?? []}>
                      <defs>
                        <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 12 }} />
                      <YAxis domain={[0, 5]} tick={{ fill: '#475569', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#0f172a',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="avgRating"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="url(#ratingGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="mb-4 text-sm font-semibold text-slate-700">User Growth</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={userGrowth}>
                        <defs>
                          <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            color: '#0f172a',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#userGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="mb-4 text-sm font-semibold text-slate-700">Order Status</h3>
                    <div className="space-y-3">
                      {Object.entries(ordersByStatus).map(([status, count]) => {
                        const total = stats.totalOrders || 1;
                        const pct = Math.round((count / total) * 100);

                        return (
                          <div key={status}>
                            <div className="flex items-center justify-between text-sm">
                              <AdminBadge variant={getStatusVariant(status)}>{status}</AdminBadge>
                              <span className="text-slate-500">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Top Selling Product
              </p>
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {topSellingProduct?.name ?? 'No data available'}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {topSellingProduct
                  ? `${topSellingProduct.orderCount} orders - Rs. ${(topSellingProduct.revenue ?? 0).toLocaleString()}`
                  : 'No data available'}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <FiAward size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Most Active User
              </p>
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {mostActiveUser?.name ?? 'No data available'}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {mostActiveUser
                  ? `${mostActiveUser.activityCount} ${mostActiveUser.activityLabel}`
                  : 'No data available'}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <FiTrendingUp size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Top Category
              </p>
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {topCategory?.name ?? 'No data available'}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {topCategory ? `${topCategory.listingCount} listings` : 'No data available'}
              </p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <FiStar size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Recent Users</h3>
          <div className="space-y-3">
            {filteredRecentUsers.length > 0 ? (
              filteredRecentUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                    {user.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-600">{user.email}</p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {format(new Date(user.createdAt), 'MMM d')}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
                <FiSearch className="mx-auto mb-2 h-4 w-4 text-slate-400" />
                No matching users found.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Recent Orders</h3>
          <div className="space-y-3">
            {filteredRecentOrders.length > 0 ? (
              filteredRecentOrders.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {order.titleSnapshot}
                    </p>
                    <p className="text-xs text-slate-600">
                      {order.buyerId?.name} to {order.sellerId?.name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium text-slate-900">
                      Rs. {order.totalAmount?.toLocaleString()}
                    </span>
                    <AdminBadge variant={getStatusVariant(order.status)}>
                      {order.status}
                    </AdminBadge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
                <FiSearch className="mx-auto mb-2 h-4 w-4 text-slate-400" />
                No matching orders found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;