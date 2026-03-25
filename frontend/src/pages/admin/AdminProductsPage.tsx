import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/api/admin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/admin/AdminTable';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminBadge, { getStatusVariant } from '@/components/admin/AdminBadge';
import type { AdminListing, Pagination } from '@/types/admin';
import { format } from 'date-fns';

const AdminProductsPage: React.FC = () => {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
          <option value="DELETED">Deleted</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50">
        <AdminTable columns={columns} data={listings} loading={loading} emptyMessage="No products found" />
        <AdminPagination pagination={pagination} onPageChange={(p) => fetchListings(p)} />
      </div>
    </div>
  );
};

export default AdminProductsPage;
