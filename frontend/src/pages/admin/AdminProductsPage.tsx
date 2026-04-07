import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { adminApi } from '@/api/admin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/admin/AdminTable';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminBadge, { getStatusVariant } from '@/components/admin/AdminBadge';
import AdminModal from '@/components/admin/AdminModal';
import AdminStatCard from '@/components/admin/AdminStatCard';
import ProductReportModal from '@/components/admin/ProductReportModal';
import type { AdminListing, Pagination } from '@/types/admin';
import { FiBarChart2, FiClock, FiDownload, FiEye, FiFileText, FiPackage, FiTrendingUp } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  generateAdminProductsPdf,
  type ProductReportOptions,
} from '@/utils/adminProductReport';

const AdminProductsPage: React.FC = () => {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [analyticsListings, setAnalyticsListings] = useState<AdminListing[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchListings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getListings({ page, limit: 15, search, status: statusFilter || undefined });
      setListings(res.data.listings);
      setPagination(res.data.pagination);
    } catch {
      // global
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchAnalyticsListings = useCallback(async () => {
    setAnalyticsLoading(true);

    try {
      const merged: AdminListing[] = [];
      const limit = 100;
      let page = 1;
      let totalPages = 1;

      do {
        const response = await adminApi.getListings({
          page,
          limit,
          search,
          status: statusFilter || undefined,
        });

        merged.push(...response.data.listings);
        totalPages = response.data.pagination.totalPages || 1;
        page += 1;
      } while (page <= totalPages && page <= 50);

      setAnalyticsListings(merged);
    } catch {
      setAnalyticsListings([]);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [search, statusFilter]);

  const handleSuspend = async () => {
    if (!selectedListing || !suspendReason.trim()) return;
    setActionLoading(true);
    try {
      await adminApi.suspendListing(selectedListing._id, suspendReason);
      setSuspendModalOpen(false);
      setSuspendReason('');
      setSelectedListing(null);
      fetchListings(pagination.page);
      fetchAnalyticsListings();
    } catch (err) {
      console.error(err);
      alert('Failed to suspend listing.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id: string, actionName = 'approve') => {
    if (!window.confirm(`Are you sure you want to ${actionName} this listing?`)) return;
    try {
      await adminApi.approveListing(id);
      fetchListings(pagination.page);
      fetchAnalyticsListings();
    } catch (err) {
      console.error(err);
      alert(`Failed to ${actionName} listing.`);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchListings(1);
      void fetchAnalyticsListings();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAnalyticsListings, fetchListings]);

  const analytics = useMemo(() => {
    const rows = analyticsListings;
    const totalProducts = rows.length;
    const active = rows.filter((row) => row.status === 'ACTIVE').length;
    const sold = rows.filter((row) => row.status === 'SOLD').length;
    const underReview = rows.filter((row) => row.status === 'UNDER_REVIEW').length;
    const suspended = rows.filter((row) => row.status === 'SUSPENDED').length;
    const totalViews = rows.reduce((sum, row) => sum + (row.viewsCount ?? 0), 0);
    const averagePrice = totalProducts
      ? Math.round(rows.reduce((sum, row) => sum + (row.price ?? 0), 0) / totalProducts)
      : 0;

    return {
      totalProducts,
      active,
      sold,
      underReview,
      suspended,
      totalViews,
      averagePrice,
    };
  }, [analyticsListings]);

  const exportCsv = () => {
    if (analyticsListings.length === 0) {
      toast.error('No products found to export.');
      return;
    }

    setCsvLoading(true);
    try {
      const headers = ['Title', 'Owner', 'Owner Email', 'Category', 'Price', 'Currency', 'Condition', 'Status', 'Views', 'Listed Date'];
      const rows = analyticsListings.map((row) => [
        row.title || '',
        row.ownerId?.name || '',
        row.ownerId?.email || '',
        row.categoryId?.name || '',
        String(row.price ?? 0),
        row.currency || 'LKR',
        row.condition || '',
        row.status || '',
        String(row.viewsCount ?? 0),
        format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm'),
      ]);

      const csv = [headers, ...rows]
        .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `bazzoro-products-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);

      toast.success('CSV report downloaded.');
    } finally {
      setCsvLoading(false);
    }
  };

  const generatePdf = async (options: ProductReportOptions) => {
    if (analyticsListings.length === 0) {
      toast.error('No products available to generate report.');
      return;
    }

    setPdfLoading(true);
    try {
      await generateAdminProductsPdf({
        listings: analyticsListings,
        options,
      });
      setPdfModalOpen(false);
      toast.success('PDF report generated successfully.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate PDF report.');
    } finally {
      setPdfLoading(false);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Product',
      render: (row: AdminListing) => (
        <div className="flex items-center gap-3">
          {row.images?.[0] ? (
            <img src={row.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-slate-100 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900 max-w-[200px]">{row.title}</p>
            <p className="text-xs text-slate-600">{row.categoryId?.name ?? 'No category'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (row: AdminListing) => (
        <div>
          <p className="text-sm text-slate-900">{row.ownerId?.name}</p>
          <p className="text-xs text-slate-600">{row.ownerId?.email}</p>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (row: AdminListing) => (
        <span className="font-medium text-slate-900">
          {row.currency ?? 'LKR'} {row.price?.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'condition',
      header: 'Condition',
      render: (row: AdminListing) => (
        <span className="text-slate-500 text-xs">{row.condition?.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: AdminListing) => (
        <AdminBadge variant={getStatusVariant(row.status)}>{row.status}</AdminBadge>
      ),
    },
    {
      key: 'views',
      header: 'Views',
      render: (row: AdminListing) => (
        <span className="text-slate-500">{row.viewsCount ?? 0}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Listed',
      render: (row: AdminListing) => (
        <span className="text-xs text-slate-500">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: AdminListing) => (
        <div className="flex gap-2">
          {row.status === 'ACTIVE' && (
            <button
              onClick={() => { setSelectedListing(row); setSuspendModalOpen(true); }}
              className="rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20"
            >
              Suspend
            </button>
          )}
          {row.status === 'UNDER_REVIEW' && (
            <button
              onClick={() => handleApprove(row._id)}
              className="rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-500 transition-colors hover:bg-emerald-500/20"
            >
              Approve
            </button>
          )}
          {row.status === 'SUSPENDED' && (
            <button
              onClick={() => handleApprove(row._id, 'restore')}
              className="rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-500 transition-colors hover:bg-emerald-500/20"
            >
              Restore
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Products"
        description={`${pagination.total} product listings`}
        actions={(
          <>
            <button
              type="button"
              onClick={exportCsv}
              disabled={csvLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiDownload size={16} />
              {csvLoading ? 'Preparing CSV...' : 'Download CSV'}
            </button>
            <button
              type="button"
              onClick={() => setPdfModalOpen(true)}
              disabled={pdfLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiFileText size={16} />
              {pdfLoading ? 'Generating PDF...' : 'Download PDF Report'}
            </button>
          </>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard title="Total Products" value={analytics.totalProducts} icon={<FiPackage size={18} />} color="blue" />
        <AdminStatCard title="Active" value={analytics.active} icon={<FiTrendingUp size={18} />} color="emerald" />
        <AdminStatCard title="Sold" value={analytics.sold} icon={<FiBarChart2 size={18} />} color="cyan" />
        <AdminStatCard title="Under Review" value={analytics.underReview} icon={<FiClock size={18} />} color="amber" />
        <AdminStatCard title="Suspended" value={analytics.suspended} icon={<FiFileText size={18} />} color="rose" />
        <AdminStatCard title="Total Views" value={analytics.totalViews.toLocaleString()} icon={<FiEye size={18} />} color="violet" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">Average Price:</span> LKR {analytics.averagePrice.toLocaleString()}.
          {analyticsLoading ? ' Refreshing analytics snapshot...' : ' Analytics reflects current filters.'}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full max-w-sm">
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search products..." />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SOLD">Sold</option>
          <option value="HIDDEN">Hidden</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="DELETED">Deleted</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <AdminTable columns={columns} data={listings} loading={loading} emptyMessage="No products found" />
        <AdminPagination pagination={pagination} onPageChange={(p) => fetchListings(p)} />
      </div>

      <AdminModal
        isOpen={suspendModalOpen}
        onClose={() => { setSuspendModalOpen(false); setSuspendReason(''); setSelectedListing(null); }}
        title="Suspend Listing"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            You are about to suspend <strong>{selectedListing?.title}</strong>. This will hide the listing from the marketplace. The owner will be notified and given 3 hours to appeal or edit the listing before it is permanently deleted.
          </p>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Suspension Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={4}
              placeholder="Provide a detailed reason for suspending this product..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => { setSuspendModalOpen(false); setSuspendReason(''); }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSuspend}
              disabled={!suspendReason.trim() || actionLoading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading ? 'Suspending...' : 'Suspend Listing'}
            </button>
          </div>
        </div>
      </AdminModal>

      <ProductReportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onGenerate={generatePdf}
        isGenerating={pdfLoading}
      />
    </div>
  );
};

export default AdminProductsPage;
