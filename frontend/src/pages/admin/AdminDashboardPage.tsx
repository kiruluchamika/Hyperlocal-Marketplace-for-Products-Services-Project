import React, { useEffect, useState } from 'react';
import {
  FiUsers,
  FiPackage,
  FiBriefcase,
  FiShoppingCart,
  FiCreditCard,
  FiLayers,
  FiMessageSquare,
  FiStar,
  FiShield,
} from 'react-icons/fi';
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
import FullPageLoader from '@/components/ui/FullPageLoader';
import type { DashboardData, ChartData } from '@/types/admin';
import { format } from 'date-fns';

const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const { stats, recentUsers, recentOrders, ordersByStatus, userGrowth } = data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-slate-600">
          Welcome back! Here&apos;s what&apos;s happening with your marketplace.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9">
        <AdminStatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={<FiUsers size={22} />} color="blue" />
        <AdminStatCard title="Products" value={stats.totalProducts.toLocaleString()} icon={<FiPackage size={22} />} color="emerald" />
        <AdminStatCard title="Services" value={stats.totalServices.toLocaleString()} icon={<FiBriefcase size={22} />} color="violet" />
        <AdminStatCard title="Orders" value={stats.totalOrders.toLocaleString()} icon={<FiShoppingCart size={22} />} color="amber" />
        <AdminStatCard title="Revenue" value={`Rs. ${stats.totalRevenue.toLocaleString()}`} icon={<FiCreditCard size={22} />} color="cyan" />
        <AdminStatCard title="Categories" value={stats.totalCategories.toLocaleString()} icon={<FiLayers size={22} />} color="rose" />
        <AdminStatCard title="Total Reviews" value={stats.totalReviews.toLocaleString()} icon={<FiMessageSquare size={22} />} color="blue" />
        <AdminStatCard title="Hidden Ratio" value={`${stats.hiddenReviewRatio.toFixed(1)}%`} icon={<FiShield size={22} />} color="rose" />
        <AdminStatCard title="Avg Rating" value={stats.averageServiceRating.toFixed(1)} icon={<FiStar size={22} />} color="amber" />
      </div>

      {/* Charts Row */}
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
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
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
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }} />
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
            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }} />
            <Area type="monotone" dataKey="avgRating" stroke="#f59e0b" strokeWidth={2} fill="url(#ratingGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* User Growth + Order Status */}
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
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }} />
              <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#userGrad)" />
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
                    <span className="text-slate-500">{count} ({pct}%)</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Users & Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Recent Users</h3>
          <div className="space-y-3">
            {recentUsers.map((u) => (
              <div key={u._id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium shrink-0">
                  {u.profileImage ? <img src={u.profileImage} alt="" className="h-9 w-9 rounded-full object-cover" /> : u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{u.name}</p>
                  <p className="truncate text-xs text-slate-600">{u.email}</p>
                </div>
                <span className="text-xs text-slate-500">{format(new Date(u.createdAt), 'MMM d')}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.map((o) => (
              <div key={o._id} className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{o.titleSnapshot}</p>
                  <p className="text-xs text-slate-600">{o.buyerId?.name} → {o.sellerId?.name}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-medium text-slate-900">Rs. {o.totalAmount?.toLocaleString()}</span>
                  <AdminBadge variant={getStatusVariant(o.status)}>{o.status}</AdminBadge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
