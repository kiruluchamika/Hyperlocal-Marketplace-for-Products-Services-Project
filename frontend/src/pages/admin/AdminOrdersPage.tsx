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
      const safeTitle = (order.titleSnapshot || '').replace(/,/g, ' ');
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
          <p className="truncate font-medium text-slate-900 max-w-[200px]">{row.titleSnapshot}</p>
          <p className="text-xs text-slate-600">Qty: {row.quantity}</p>
        </div>
      ),
    },
    {
      key: 'buyer',
      header: 'Buyer',
      render: (row: AdminOrder) => (
        <div>
          <p className="text-sm text-slate-900">{row.buyerId?.name}</p>
          <p className="text-xs text-slate-600">{row.buyerId?.email}</p>
        </div>
      ),
    },
    {
      key: 'seller',
      header: 'Seller',
      render: (row: AdminOrder) => (
        <div>
          <p className="text-sm text-slate-900">{row.sellerId?.name}</p>
          <p className="text-xs text-slate-600">{row.sellerId?.email}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (row: AdminOrder) => (
        <span className="font-medium text-slate-900">Rs. {row.totalAmount?.toLocaleString()}</span>
      ),
    },
    {
      key: 'delivery',
      header: 'Delivery',
      render: (row: AdminOrder) => (
        <span className="text-xs text-slate-500">{row.deliveryMethod}</span>
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
        <span className="text-xs text-slate-500">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
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
          className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
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
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={exportVisibleOrders}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              Export CSV
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-600">Total</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{orderStats.total}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-amber-700">Pending</p>
          <p className="mt-1 text-xl font-semibold text-amber-900">{orderStats.pending}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-indigo-700">In Progress</p>
          <p className="mt-1 text-xl font-semibold text-indigo-900">{orderStats.inProgress}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Completed</p>
          <p className="mt-1 text-xl font-semibold text-emerald-900">{orderStats.completed}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by order ID, title, buyer or seller"
          className="w-full lg:max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
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
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
          aria-label="From date"
        />

        <input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
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
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Clear
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Order Details</h3>
              <p className="mt-1 text-xs text-slate-600">#{selectedOrder._id}</p>
            </div>
            <AdminBadge variant={getStatusVariant(selectedOrder.status)}>{selectedOrder.status}</AdminBadge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-600">Title</p>
              <p className="mt-1 font-medium text-slate-900">{selectedOrder.titleSnapshot}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-600">Amount</p>
              <p className="mt-1 font-medium text-slate-900">Rs. {selectedOrder.totalAmount?.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-600">Quantity</p>
              <p className="mt-1 font-medium text-slate-900">{selectedOrder.quantity}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-600">Delivery</p>
              <p className="mt-1 font-medium text-slate-900">{selectedOrder.deliveryMethod}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-600">Buyer</p>
              <p className="mt-1 font-medium text-slate-900">{selectedOrder.buyerId?.name || 'N/A'}</p>
              <p className="text-slate-600">{selectedOrder.buyerId?.email || 'N/A'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-600">Seller</p>
              <p className="mt-1 font-medium text-slate-900">{selectedOrder.sellerId?.name || 'N/A'}</p>
              <p className="text-slate-600">{selectedOrder.sellerId?.email || 'N/A'}</p>
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
