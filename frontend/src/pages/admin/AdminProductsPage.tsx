import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/api/admin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/admin/AdminTable';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminBadge, { getStatusVariant } from '@/components/admin/AdminBadge';
import AdminModal from '@/components/admin/AdminModal';
import type { AdminListing, Pagination } from '@/types/admin';
import { format } from 'date-fns';

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

  const handleSuspend = async () => {
    if (!selectedListing || !suspendReason.trim()) return;
    setActionLoading(true);
    try {
      await adminApi.suspendListing(selectedListing._id, suspendReason);
      setSuspendModalOpen(false);
      setSuspendReason('');
      setSelectedListing(null);
      fetchListings(pagination.page);
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
    } catch (err) {
      console.error(err);
      alert(`Failed to ${actionName} listing.`);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchListings(1), 300);
    return () => clearTimeout(timer);
  }, [fetchListings]);

  const columns = [
    {
      key: 'title',
      header: 'Product',
      render: (row: AdminListing) => (
        <div className="flex items-center gap-3">
          {row.images?.[0] ? (
            <img src={row.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-slate-800 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-white max-w-[200px]">{row.title}</p>
            <p className="text-xs text-slate-500">{row.categoryId?.name ?? 'No category'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (row: AdminListing) => (
        <div>
          <p className="text-sm text-white">{row.ownerId?.name}</p>
          <p className="text-xs text-slate-500">{row.ownerId?.email}</p>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (row: AdminListing) => (
        <span className="font-medium text-white">
          {row.currency ?? 'LKR'} {row.price?.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'condition',
      header: 'Condition',
      render: (row: AdminListing) => (
        <span className="text-slate-400 text-xs">{row.condition?.replace(/_/g, ' ')}</span>
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
        <span className="text-slate-400">{row.viewsCount ?? 0}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Listed',
      render: (row: AdminListing) => (
        <span className="text-xs text-slate-400">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
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
      <AdminPageHeader title="Products" description={`${pagination.total} product listings`} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full max-w-sm">
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search products..." />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50"
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

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50">
        <AdminTable columns={columns} data={listings} loading={loading} emptyMessage="No products found" />
        <AdminPagination pagination={pagination} onPageChange={(p) => fetchListings(p)} />
      </div>

      <AdminModal
        isOpen={suspendModalOpen}
        onClose={() => { setSuspendModalOpen(false); setSuspendReason(''); setSelectedListing(null); }}
        title="Suspend Listing"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            You are about to suspend <strong>{selectedListing?.title}</strong>. This will hide the listing from the marketplace. The owner will be notified and given 3 hours to appeal or edit the listing before it is permanently deleted.
          </p>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Suspension Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={4}
              placeholder="Provide a detailed reason for suspending this product..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => { setSuspendModalOpen(false); setSuspendReason(''); }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
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
    </div>
  );
};

export default AdminProductsPage;
