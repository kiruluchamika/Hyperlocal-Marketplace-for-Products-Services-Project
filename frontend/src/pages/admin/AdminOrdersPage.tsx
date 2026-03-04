import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/api/admin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminBadge, { getStatusVariant } from '@/components/admin/AdminBadge';
import type { AdminOrder, Pagination } from '@/types/admin';
import { format } from 'date-fns';

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getOrders({ page, limit: 15, status: statusFilter || undefined });
      setOrders(res.data.orders);
      setPagination(res.data.pagination);
    } catch {
      // global
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (row: AdminOrder) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-white max-w-[200px]">{row.titleSnapshot}</p>
          <p className="text-xs text-slate-500">Qty: {row.quantity}</p>
        </div>
      ),
    },
    {
      key: 'buyer',
      header: 'Buyer',
      render: (row: AdminOrder) => (
        <div>
          <p className="text-sm text-white">{row.buyerId?.name}</p>
          <p className="text-xs text-slate-500">{row.buyerId?.email}</p>
        </div>
      ),
    },
    {
      key: 'seller',
      header: 'Seller',
      render: (row: AdminOrder) => (
        <div>
          <p className="text-sm text-white">{row.sellerId?.name}</p>
          <p className="text-xs text-slate-500">{row.sellerId?.email}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (row: AdminOrder) => (
        <span className="font-medium text-white">Rs. {row.totalAmount?.toLocaleString()}</span>
      ),
    },
    {
      key: 'delivery',
      header: 'Delivery',
      render: (row: AdminOrder) => (
        <span className="text-xs text-slate-400">{row.deliveryMethod}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: AdminOrder) => (
        <AdminBadge variant={getStatusVariant(row.status)}>{row.status}</AdminBadge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row: AdminOrder) => (
        <span className="text-xs text-slate-400">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Orders" description={`${pagination.total} total orders`} />

      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50">
        <AdminTable columns={columns} data={orders} loading={loading} emptyMessage="No orders found" />
        <AdminPagination pagination={pagination} onPageChange={(p) => fetchOrders(p)} />
      </div>
    </div>
  );
};

export default AdminOrdersPage;
