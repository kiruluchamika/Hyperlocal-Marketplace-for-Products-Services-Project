import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/api/admin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminBadge, { getStatusVariant } from '@/components/admin/AdminBadge';
import type { AdminPayment, Pagination } from '@/types/admin';
import { format } from 'date-fns';

const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPayments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getPayments({ page, limit: 15, status: statusFilter || undefined });
      setPayments(res.data.payments);
      setPagination(res.data.pagination);
    } catch {
      // global
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const columns = [
    {
      key: 'orderId',
      header: 'Order',
      render: (row: AdminPayment) => (
        <div>
          <p className="font-medium text-white truncate max-w-[180px]">{row.orderId?.titleSnapshot ?? '—'}</p>
          <p className="text-xs text-slate-500">{row.providerPaymentId}</p>
        </div>
      ),
    },
    {
      key: 'buyer',
      header: 'Buyer',
      render: (row: AdminPayment) => (
        <div>
          <p className="text-sm text-white">{row.buyerId?.name}</p>
          <p className="text-xs text-slate-500">{row.buyerId?.email}</p>
        </div>
      ),
    },
    {
      key: 'seller',
      header: 'Seller',
      render: (row: AdminPayment) => (
        <div>
          <p className="text-sm text-white">{row.sellerId?.name}</p>
          <p className="text-xs text-slate-500">{row.sellerId?.email}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: AdminPayment) => (
        <span className="font-medium text-white">
          {(row.currency ?? 'LKR').toUpperCase()} {row.amount?.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: AdminPayment) => (
        <AdminBadge variant={getStatusVariant(row.status)}>{row.status}</AdminBadge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row: AdminPayment) => (
        <span className="text-xs text-slate-400">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Payments" description={`${pagination.total} payment records`} />

      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50"
        >
          <option value="">All Status</option>
          <option value="INITIATED">Initiated</option>
          <option value="HELD">Held</option>
          <option value="RELEASED">Released</option>
          <option value="REFUNDED">Refunded</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50">
        <AdminTable columns={columns} data={payments} loading={loading} emptyMessage="No payments found" />
        <AdminPagination pagination={pagination} onPageChange={(p) => fetchPayments(p)} />
      </div>
    </div>
  );
};

export default AdminPaymentsPage;
