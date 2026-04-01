import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/api/admin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminBadge, { getStatusVariant } from '@/components/admin/AdminBadge';
import type { AdminBooking, Pagination } from '@/types/admin';
import { format } from 'date-fns';

const AdminBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBookings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getBookings({ page, limit: 15, status: statusFilter || undefined });
      setBookings(res.data.bookings);
      setPagination(res.data.pagination);
    } catch {
      // global
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings(1);
  }, [fetchBookings]);

  const columns = [
    {
      key: 'service',
      header: 'Service',
      render: (row: AdminBooking) => (
        <div>
          <p className="font-medium text-slate-900">{row.serviceId?.title ?? '—'}</p>
          <p className="text-xs text-slate-600">LKR {row.serviceId?.price?.toLocaleString()}</p>
        </div>
      ),
    },
    {
      key: 'buyer',
      header: 'Customer',
      render: (row: AdminBooking) => (
        <div>
          <p className="text-sm text-slate-900">{row.buyerId?.name}</p>
          <p className="text-xs text-slate-600">{row.buyerId?.email}</p>
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (row: AdminBooking) => (
        <div>
          <p className="text-sm text-slate-900">{row.providerId?.name}</p>
          <p className="text-xs text-slate-600">{row.providerId?.email}</p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (row: AdminBooking) => (
        <div>
          <p className="text-sm text-slate-900">{format(new Date(row.startAt), 'MMM d, yyyy')}</p>
          <p className="text-xs text-slate-600">{row.durationMinutes} min</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: AdminBooking) => (
        <AdminBadge variant={getStatusVariant(row.status)}>{row.status}</AdminBadge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: AdminBooking) => (
        <span className="text-xs text-slate-500">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Service Bookings" description={`${pagination.total} total bookings`} />

      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="PROVIDER_ACCEPTED">Accepted</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <AdminTable columns={columns} data={bookings} loading={loading} emptyMessage="No bookings found" />
        <AdminPagination pagination={pagination} onPageChange={(p) => fetchBookings(p)} />
      </div>
    </div>
  );
};

export default AdminBookingsPage;
