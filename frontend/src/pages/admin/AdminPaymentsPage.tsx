import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiDownload, FiRefreshCw, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { adminApi } from '@/api/admin';
import AdminTable from '@/components/admin/AdminTable';
import AdminBadge, { getStatusVariant } from '@/components/admin/AdminBadge';
import GifLoader from '@/components/ui/GifLoader';
import type { AdminPayment, AdminBooking } from '@/types/admin';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface AdminPaymentStats {
  totalPayments: number;
  totalAmount: number;
  pendingPayouts: number;
  pendingPayoutAmount: number;
  completedPayments: number;
  failedPayments: number;
}

type PaymentSource = 'PRODUCT' | 'SERVICE';

type UnifiedPaymentRow = {
  _id: string;
  source: PaymentSource;
  title: string;
  buyerName: string;
  buyerEmail: string;
  sellerName: string;
  sellerEmail: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  rawPayment?: AdminPayment;
  rawBooking?: AdminBooking;
};

const PRODUCT_STATUS_OPTIONS = [
  { value: '', label: 'All Product Statuses' },
  { value: 'INITIATED', label: 'Initiated' },
  { value: 'HELD', label: 'Held' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'FAILED', label: 'Failed' },
];

const SERVICE_STATUS_OPTIONS = [
  { value: '', label: 'All Service Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROVIDER_ACCEPTED', label: 'Accepted' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const ALL_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  ...PRODUCT_STATUS_OPTIONS.slice(1),
  ...SERVICE_STATUS_OPTIONS.slice(1),
];

const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | PaymentSource>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<UnifiedPaymentRow | null>(null);
  const itemsPerPage = 10;

  const formatLKR = (amount: number) =>
    new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const [paymentResponse, bookingResponse] = await Promise.all([
        adminApi.getPayments({ page: 1, limit: 1000 }),
        adminApi.getBookings({ page: 1, limit: 1000 }),
      ]);
      setPayments(paymentResponse.data?.payments || []);
      setBookings(bookingResponse.data?.bookings || []);
    } catch (error) {
      toast.error('Failed to load payments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const unifiedRows = useMemo<UnifiedPaymentRow[]>(() => {
    const productRows: UnifiedPaymentRow[] = payments.map((payment) => ({
      _id: payment._id,
      source: 'PRODUCT',
      title: payment.orderId?.titleSnapshot || 'N/A',
      buyerName: payment.buyerId?.name || 'N/A',
      buyerEmail: payment.buyerId?.email || 'N/A',
      sellerName: payment.sellerId?.name || 'N/A',
      sellerEmail: payment.sellerId?.email || 'N/A',
      providerPaymentId: payment.providerPaymentId || payment._id,
      amount: payment.amount || 0,
      currency: 'LKR',
      status: payment.status || 'UNKNOWN',
      createdAt: payment.createdAt,
      rawPayment: payment,
    }));

    const serviceRows: UnifiedPaymentRow[] = bookings.map((booking) => ({
      _id: `booking-${booking._id}`,
      source: 'SERVICE',
      title: booking.serviceId?.title || 'Service Booking',
      buyerName: booking.buyerId?.name || 'N/A',
      buyerEmail: booking.buyerId?.email || 'N/A',
      sellerName: booking.providerId?.name || 'N/A',
      sellerEmail: booking.providerId?.email || 'N/A',
      providerPaymentId: booking._id,
      amount: booking.serviceId?.price || 0,
      currency: 'LKR',
      status: booking.status || 'UNKNOWN',
      createdAt: booking.createdAt,
      rawBooking: booking,
    }));

    return [...productRows, ...serviceRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [payments, bookings]);

  const visiblePayments = useMemo(() => {
    return unifiedRows.filter((payment) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        payment.title.toLowerCase().includes(searchLower) ||
        payment.buyerName.toLowerCase().includes(searchLower) ||
        payment.buyerEmail.toLowerCase().includes(searchLower) ||
        payment.sellerName.toLowerCase().includes(searchLower) ||
        payment.sellerEmail.toLowerCase().includes(searchLower);

      const matchesStatus = !statusFilter || payment.status === statusFilter;
      const matchesSource = sourceFilter === 'ALL' || payment.source === sourceFilter;

      let matchesDateRange = true;
      if (fromDate || toDate) {
        const paymentDate = new Date(payment.createdAt);
        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          matchesDateRange = matchesDateRange && paymentDate >= from;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          matchesDateRange = matchesDateRange && paymentDate <= to;
        }
      }

      return matchesSearch && matchesStatus && matchesSource && matchesDateRange;
    });
  }, [unifiedRows, searchTerm, statusFilter, sourceFilter, fromDate, toDate]);

  const statusOptions = useMemo(() => {
    if (sourceFilter === 'PRODUCT') return PRODUCT_STATUS_OPTIONS;
    if (sourceFilter === 'SERVICE') return SERVICE_STATUS_OPTIONS;
    return ALL_STATUS_OPTIONS;
  }, [sourceFilter]);

  useEffect(() => {
    const currentStatusIsValid = statusOptions.some((option) => option.value === statusFilter);
    if (!currentStatusIsValid) {
      setStatusFilter('');
    }
  }, [statusFilter, statusOptions]);

  const stats = useMemo((): AdminPaymentStats => {
    return {
      totalPayments: visiblePayments.length,
      totalAmount: visiblePayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      pendingPayouts: visiblePayments.filter((p) => ['HELD', 'PENDING', 'PROVIDER_ACCEPTED'].includes(p.status)).length,
      pendingPayoutAmount: visiblePayments
        .filter((p) => ['HELD', 'PENDING', 'PROVIDER_ACCEPTED'].includes(p.status))
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      completedPayments: visiblePayments.filter((p) => ['RELEASED', 'CONFIRMED'].includes(p.status)).length,
      failedPayments: visiblePayments.filter((p) => ['FAILED', 'REFUNDED', 'REJECTED', 'CANCELLED'].includes(p.status)).length,
    };
  }, [visiblePayments]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return visiblePayments.slice(start, start + itemsPerPage);
  }, [visiblePayments, currentPage]);

  const totalPages = Math.max(1, Math.ceil(visiblePayments.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const handleExportCSV = () => {
    const csvContent = [
      ['Source', 'Title', 'Buyer', 'Seller', 'Amount', 'Status', 'Date'],
      ...visiblePayments.map((p) => [
        p.source,
        p.title || 'N/A',
        p.buyerName || 'N/A',
        p.sellerName || 'N/A',
        formatLKR(p.amount || 0),
        p.status || 'N/A',
        format(new Date(p.createdAt), 'yyyy-MM-dd HH:mm'),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Payments exported as CSV');
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Payment Management"
        description="Track all payments and transactions across the platform"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-6"
        >
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Total Payments</div>
          <div className="text-2xl font-bold text-white">{stats.totalPayments}</div>
          <div className="text-sm text-slate-300 mt-1">{formatLKR(stats.totalAmount)}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-6"
        >
          <div className="text-xs uppercase tracking-wide text-amber-200 mb-2">Pending Payouts</div>
          <div className="text-2xl font-bold text-amber-100">{stats.pendingPayouts}</div>
          <div className="text-sm text-amber-300 font-medium mt-1">{formatLKR(stats.pendingPayoutAmount)}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6"
        >
          <div className="text-xs uppercase tracking-wide text-emerald-200 mb-2">Completed</div>
          <div className="text-2xl font-bold text-emerald-100">{stats.completedPayments}</div>
          <div className="text-sm text-emerald-300 font-medium mt-1">Released and settled</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6"
        >
          <div className="text-xs uppercase tracking-wide text-rose-200 mb-2">Failed/Refunded</div>
          <div className="text-2xl font-bold text-rose-100">{stats.failedPayments}</div>
          <div className="text-sm text-rose-300 font-medium mt-1">Transactions</div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by order title, buyer, or seller..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 pl-10 pr-4 py-2.5
                       text-sm text-slate-200 outline-none transition-all placeholder:text-slate-500
                       focus:border-blue-500/50"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5
                       text-sm text-slate-200 outline-none focus:border-blue-500/50"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value as 'ALL' | PaymentSource);
              setStatusFilter('');
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5
                       text-sm text-slate-200 outline-none focus:border-blue-500/50"
          >
            <option value="ALL">All Sources</option>
            <option value="PRODUCT">Product Payments</option>
            <option value="SERVICE">Service Payments</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5
                       text-sm text-slate-200 outline-none focus:border-blue-500/50"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5
                       text-sm text-slate-200 outline-none focus:border-blue-500/50"
          />

          <div></div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-slate-400">
            {visiblePayments.length} payment{visiblePayments.length !== 1 ? 's' : ''} found
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadPayments}
              className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2 text-sm font-medium
                         text-slate-200 transition-colors hover:bg-slate-700/60 flex items-center gap-2"
            >
              <FiRefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium
                         text-emerald-300 transition-colors hover:bg-emerald-500/20 flex items-center gap-2"
            >
              <FiDownload className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-8 text-center">
          <GifLoader size="md" label="Loading payments..." className="text-slate-400" />
        </div>
      ) : visiblePayments.length === 0 ? (
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">No payments found</p>
        </div>
      ) : (
        <>
          <AdminTable
            columns={[
              {
                key: 'source',
                header: 'Source',
                render: (row: UnifiedPaymentRow) => (
                  <AdminBadge variant={row.source === 'SERVICE' ? 'purple' : 'info'}>{row.source}</AdminBadge>
                ),
              },
              {
                key: 'order',
                header: 'Order',
                render: (row: UnifiedPaymentRow) => (
                  <div>
                    <p className="font-medium text-white truncate max-w-[200px]">{row.title || 'N/A'}</p>
                    <p className="text-xs text-slate-500">{row.providerPaymentId}</p>
                  </div>
                ),
              },
              {
                key: 'buyer',
                header: 'Buyer',
                render: (row: UnifiedPaymentRow) => (
                  <div>
                    <p className="text-sm text-white">{row.buyerName || 'N/A'}</p>
                    <p className="text-xs text-slate-500">{row.buyerEmail}</p>
                  </div>
                ),
              },
              {
                key: 'seller',
                header: 'Seller',
                render: (row: UnifiedPaymentRow) => (
                  <div>
                    <p className="text-sm text-white">{row.sellerName || 'N/A'}</p>
                    <p className="text-xs text-slate-500">{row.sellerEmail}</p>
                  </div>
                ),
              },
              {
                key: 'amount',
                header: 'Amount',
                render: (row: UnifiedPaymentRow) => (
                  <span className="font-medium text-white">{formatLKR(row.amount || 0)}</span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row: UnifiedPaymentRow) => (
                  <AdminBadge variant={getStatusVariant(row.status || '')}>{row.status || 'UNKNOWN'}</AdminBadge>
                ),
              },
              {
                key: 'createdAt',
                header: 'Date',
                render: (row: UnifiedPaymentRow) => (
                  <span className="text-xs text-slate-400">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
                ),
              },
              {
                key: 'view',
                header: 'View',
                render: (row: UnifiedPaymentRow) => (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedPayment(row);
                    }}
                    className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
                  >
                    Details
                  </button>
                ),
              },
            ]}
            data={paginatedPayments}
            loading={loading}
            emptyMessage="No payments found"
          />

          {totalPages > 1 && (
            <AdminPagination
              pagination={{ total: visiblePayments.length, page: currentPage, totalPages }}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Detail Panel */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 bg-white">
              <h2 className="text-xl font-bold text-slate-900">Payment Details</h2>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Transaction Info */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Transaction Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Order Title</p>
                    <p className="text-sm font-medium text-slate-900">{selectedPayment.title || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Payment ID</p>
                    <p className="font-mono text-sm font-medium text-slate-900">{selectedPayment.providerPaymentId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Amount</p>
                    <p className="text-lg font-semibold text-slate-900">{formatLKR(selectedPayment.amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Currency</p>
                    <p className="text-sm font-medium text-slate-900">LKR</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Source</p>
                    <p className="text-sm font-medium text-slate-900">{selectedPayment.source}</p>
                  </div>
                </div>
              </div>

              {/* Buyer Info */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Buyer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Name</p>
                    <p className="text-sm font-medium text-slate-900">{selectedPayment.buyerName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Email</p>
                    <p className="text-sm text-slate-900 break-all">{selectedPayment.buyerEmail || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Seller Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Name</p>
                    <p className="text-sm font-medium text-slate-900">{selectedPayment.sellerName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Email</p>
                    <p className="text-sm text-slate-900 break-all">{selectedPayment.sellerEmail || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Payment Status</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Status</p>
                    <AdminBadge variant={getStatusVariant(selectedPayment.status || '')}>
                      {selectedPayment.status || 'UNKNOWN'}
                    </AdminBadge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Created At</p>
                    <p className="text-sm font-medium text-slate-900">
                      {format(new Date(selectedPayment.createdAt), 'PPP p')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentsPage;
