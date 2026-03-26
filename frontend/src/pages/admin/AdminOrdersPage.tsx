import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { adminApi } from '@/api/admin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminBadge, { getStatusVariant } from '@/components/admin/AdminBadge';
import type { AdminOrder, Pagination } from '@/types/admin';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type ExtendedAdminOrder = AdminOrder & {
  note?: string;
  deliveryAddress?: string;
  updatedAt?: string;
};

const ORDER_STATUS_OPTIONS = [
  { label: 'All Status', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
] as const;

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<ExtendedAdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ExtendedAdminOrder | null>(null);

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getOrders({ page, limit: 15, status: statusFilter || undefined });
      setOrders(res.data.orders as ExtendedAdminOrder[]);
      setPagination(res.data.pagination);

      setSelectedOrder((current) => {
        if (!current) return (res.data.orders[0] as ExtendedAdminOrder) ?? null;
        return (res.data.orders as ExtendedAdminOrder[]).find((order) => order._id === current._id) ?? current;
      });
    } catch {
      toast.error('Failed to load admin orders.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const visibleOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        return false;
      }

      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        if (createdAt < start) {
          return false;
        }
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (createdAt > end) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const searchable = [
        order._id,
        order.titleSnapshot,
        order.status,
        order.buyerId?.name,
        order.buyerId?.email,
        order.sellerId?.name,
        order.sellerId?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [fromDate, orders, searchTerm, toDate]);

  const orderStats = useMemo(() => {
    const pending = visibleOrders.filter((order) => order.status === 'PENDING').length;
    const inProgress = visibleOrders.filter((order) => order.status === 'IN_PROGRESS').length;
    const completed = visibleOrders.filter((order) => order.status === 'COMPLETED').length;

    return {
      total: visibleOrders.length,
      pending,
      inProgress,
      completed,
    };
  }, [visibleOrders]);

  const exportVisibleOrders = () => {
    const rows = visibleOrders.map((order) => {
      const safeTitle = (order.titleSnapshot || '').replaceAll(',', ' ');
      return [
        order._id,
        safeTitle,
        order.status,
        order.buyerId?.name || '',
        order.sellerId?.name || '',
        String(order.quantity ?? 0),
        String(order.totalAmount ?? 0),
        order.deliveryMethod || '',
        order.createdAt || '',
      ].join(',');
    });

    const header = 'OrderID,Title,Status,Buyer,Seller,Quantity,TotalAmount,DeliveryMethod,CreatedAt';
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `admin-orders-page-${pagination.page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

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
    {
      key: 'view',
      header: 'View',
      render: (row: AdminOrder) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedOrder(row as ExtendedAdminOrder);
          }}
          className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
        >
          Details
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders"
        description={`${pagination.total} total orders`}
        actions={
          <>
            <button
              type="button"
              onClick={() => fetchOrders(pagination.page)}
              className="rounded-lg border border-slate-600/60 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={exportVisibleOrders}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20"
            >
              Export CSV
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 text-xl font-semibold text-white">{orderStats.total}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-amber-300">Pending</p>
          <p className="mt-1 text-xl font-semibold text-amber-200">{orderStats.pending}</p>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-indigo-300">In Progress</p>
          <p className="mt-1 text-xl font-semibold text-indigo-200">{orderStats.inProgress}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-emerald-300">Completed</p>
          <p className="mt-1 text-xl font-semibold text-emerald-200">{orderStats.completed}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by order ID, title, buyer or seller"
          className="w-full lg:max-w-md rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50"
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50"
        >
          {ORDER_STATUS_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50"
          aria-label="From date"
        />

        <input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50"
          aria-label="To date"
        />

        <button
          type="button"
          onClick={() => {
            setSearchTerm('');
            setStatusFilter('');
            setFromDate('');
            setToDate('');
          }}
          className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-700/60"
        >
          Clear
        </button>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50">
        <AdminTable
          columns={columns}
          data={visibleOrders}
          loading={loading}
          emptyMessage="No orders found"
          onRowClick={(row) => setSelectedOrder(row as ExtendedAdminOrder)}
        />
        <AdminPagination pagination={pagination} onPageChange={(p) => fetchOrders(p)} />
      </div>

      {selectedOrder && (
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Order Details</h3>
              <p className="mt-1 text-xs text-slate-500">#{selectedOrder._id}</p>
            </div>
            <AdminBadge variant={getStatusVariant(selectedOrder.status)}>{selectedOrder.status}</AdminBadge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Title</p>
              <p className="mt-1 font-medium text-slate-100">{selectedOrder.titleSnapshot}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Amount</p>
              <p className="mt-1 font-medium text-slate-100">Rs. {selectedOrder.totalAmount?.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Quantity</p>
              <p className="mt-1 font-medium text-slate-100">{selectedOrder.quantity}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Delivery</p>
              <p className="mt-1 font-medium text-slate-100">{selectedOrder.deliveryMethod}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Buyer</p>
              <p className="mt-1 font-medium text-slate-100">{selectedOrder.buyerId?.name || 'N/A'}</p>
              <p className="text-slate-400">{selectedOrder.buyerId?.email || 'N/A'}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Seller</p>
              <p className="mt-1 font-medium text-slate-100">{selectedOrder.sellerId?.name || 'N/A'}</p>
              <p className="text-slate-400">{selectedOrder.sellerId?.email || 'N/A'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>Created: {format(new Date(selectedOrder.createdAt), 'MMM d, yyyy hh:mm a')}</span>
            {selectedOrder.updatedAt && (
              <span>Updated: {format(new Date(selectedOrder.updatedAt), 'MMM d, yyyy hh:mm a')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
