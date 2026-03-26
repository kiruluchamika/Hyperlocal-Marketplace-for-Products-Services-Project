import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { FiClock, FiEye, FiMapPin, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { servicesApi } from '@/api/services';
import AdminBadge, { getStatusVariant } from '@/components/admin/AdminBadge';
import AdminModal from '@/components/admin/AdminModal';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import AdminTable from '@/components/admin/AdminTable';
import type { IServiceSelling } from '@/types';

type AdminServiceRow = IServiceSelling & {
  sellerId:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        email?: string;
      };
  categoryId:
    | string
    | {
        _id?: string;
        name?: string;
      };
};

const getSeller = (service: AdminServiceRow) =>
  typeof service.sellerId === 'object' ? service.sellerId : null;

const getSellerId = (service: AdminServiceRow) => {
  if (typeof service.sellerId === 'string') {
    return service.sellerId;
  }

  return service.sellerId?._id || service.sellerId?.id || 'Unknown user';
};

const getCategoryName = (service: AdminServiceRow) =>
  typeof service.categoryId === 'object' ? service.categoryId?.name || 'Service' : 'Service';

const formatAttributeValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value == null || value === '') {
    return 'Not provided';
  }

  return String(value);
};

const AdminServicesPage: React.FC = () => {
  const [services, setServices] = useState<AdminServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedService, setSelectedService] = useState<AdminServiceRow | null>(null);
  const [moderateReason, setModerateReason] = useState('');
  const [submittingModeration, setSubmittingModeration] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await servicesApi.getAllAdmin({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setServices(res.data.data as AdminServiceRow[]);
    } catch {
      // global error handling
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchServices();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchServices]);

  const serviceStats = useMemo(() => {
    const active = services.filter((item) => item.status === 'ACTIVE').length;
    const removed = services.filter((item) => item.status === 'REMOVED').length;
    const deleted = services.filter((item) => item.status === 'DELETED').length;

    return [
      { label: 'Total Services', value: services.length, tone: 'text-white' },
      { label: 'Active Ads', value: active, tone: 'text-emerald-400' },
      { label: 'Removed Ads', value: removed, tone: 'text-amber-400' },
      { label: 'Deleted Ads', value: deleted, tone: 'text-rose-400' },
    ];
  }, [services]);

  const openDetails = (service: AdminServiceRow) => {
    setSelectedService(service);
    setModerateReason('');
  };

  const handleModerate = async () => {
    if (!selectedService || !moderateReason.trim()) {
      return;
    }

    try {
      setSubmittingModeration(true);
      await servicesApi.moderate(selectedService._id, moderateReason.trim());
      toast.success('Service ad removed successfully');
      setSelectedService(null);
      setModerateReason('');
      await fetchServices();
    } catch {
      // global error handling
    } finally {
      setSubmittingModeration(false);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Service Ad',
      render: (row: AdminServiceRow) => (
        <button
          type="button"
          onClick={() => openDetails(row)}
          className="flex w-full items-center gap-3 text-left"
        >
          {row.images?.[0] ? (
            <img src={row.images[0]} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-500">
              <FiEye size={16} />
            </div>
          )}
          <div className="min-w-0">
            <p className="max-w-[240px] truncate font-medium text-white">{row.title}</p>
            <p className="truncate text-xs text-slate-500">
              {getCategoryName(row)} • {row.pricingType}
            </p>
          </div>
        </button>
      ),
    },
    {
      key: 'seller',
      header: 'Owner',
      render: (row: AdminServiceRow) => {
        const seller = getSeller(row);
        return seller ? (
          <div>
            <p className="text-sm text-white">{seller.name || 'Unknown user'}</p>
            <p className="text-xs text-slate-500">{seller.email || getSellerId(row)}</p>
          </div>
        ) : (
          <span className="text-slate-400">{getSellerId(row)}</span>
        );
      },
    },
    {
      key: 'price',
      header: 'Pricing',
      render: (row: AdminServiceRow) => (
        <div>
          <p className="font-medium text-white">LKR {row.price?.toLocaleString()}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">{row.pricingType}</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row: AdminServiceRow) => (
        <span className="text-sm text-slate-300">{row.location?.city || row.locationText || 'Not set'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: AdminServiceRow) => <AdminBadge variant={getStatusVariant(row.status)}>{row.status}</AdminBadge>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: AdminServiceRow) => (
        <span className="text-xs text-slate-400">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: AdminServiceRow) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => openDetails(row)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            View Details
          </button>
          {row.status === 'ACTIVE' && (
            <button
              type="button"
              onClick={() => openDetails(row)}
              className="rounded-lg bg-rose-600/15 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-600/25"
            >
              Moderate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Services"
        description="Review service ads, inspect posting details, and moderate listings across active, removed, and deleted states."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {serviceStats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
            <p className={`mt-3 text-3xl font-bold ${stat.tone}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full max-w-sm">
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search service ads..." />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="REMOVED">Removed</option>
          <option value="DELETED">Deleted</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50">
        <AdminTable columns={columns} data={services} loading={loading} emptyMessage="No service ads found" />
      </div>

      <AdminModal
        isOpen={!!selectedService}
        onClose={() => {
          setSelectedService(null);
          setModerateReason('');
        }}
        title="Service Ad Details"
        size="xl"
      >
        {selectedService && (
          <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div>
                {selectedService.images?.[0] ? (
                  <img
                    src={selectedService.images[0]}
                    alt={selectedService.title}
                    className="h-52 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-52 w-full items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                    No image
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminBadge variant={getStatusVariant(selectedService.status)}>{selectedService.status}</AdminBadge>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
                    {getCategoryName(selectedService)}
                  </span>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
                    {selectedService.pricingType}
                  </span>
                </div>

                <h2 className="mt-3 text-2xl font-semibold text-white">{selectedService.title}</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
                  {selectedService.description}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InfoItem
                    icon={<FiTag size={14} />}
                    label="Price"
                    value={`LKR ${selectedService.price.toLocaleString()}`}
                  />
                  <InfoItem
                    icon={<FiMapPin size={14} />}
                    label="Location"
                    value={selectedService.location?.city || selectedService.locationText || 'Not provided'}
                  />
                  <InfoItem
                    icon={<FiClock size={14} />}
                    label="Created"
                    value={format(new Date(selectedService.createdAt), 'MMM d, yyyy • p')}
                  />
                  <InfoItem
                    icon={<FiClock size={14} />}
                    label="Updated"
                    value={format(new Date(selectedService.updatedAt), 'MMM d, yyyy • p')}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Owner Details</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="mt-1 text-white">{getSeller(selectedService)?.name || 'Unknown user'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">User ID</p>
                    <p className="mt-1 break-all">{getSellerId(selectedService)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="mt-1">{getSeller(selectedService)?.email || 'No email'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Posting Flow</p>
                    <p className="mt-1">
                      This ad was created by an authenticated user under a predefined active service category and follows
                      the category attribute rules defined by admin.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Moderation State</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div>
                    <p className="text-xs text-slate-500">Current status</p>
                    <div className="mt-1">
                      <AdminBadge variant={getStatusVariant(selectedService.status)}>{selectedService.status}</AdminBadge>
                    </div>
                  </div>

                  {selectedService.removedReason && (
                    <div>
                      <p className="text-xs text-slate-500">Removal reason</p>
                      <p className="mt-1 text-amber-300">{selectedService.removedReason}</p>
                    </div>
                  )}

                  {selectedService.removedAt && (
                    <div>
                      <p className="text-xs text-slate-500">Removed at</p>
                      <p className="mt-1">{format(new Date(selectedService.removedAt), 'MMM d, yyyy • p')}</p>
                    </div>
                  )}

                  {selectedService.deletedAt && (
                    <div>
                      <p className="text-xs text-slate-500">Deleted at</p>
                      <p className="mt-1">{format(new Date(selectedService.deletedAt), 'MMM d, yyyy • p')}</p>
                    </div>
                  )}

                  <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-5 text-slate-400">
                    Admin supervises service ads and booking records, but does not accept bookings, pay deposits, or
                    manually complete the normal booking lifecycle.
                  </p>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Category Attributes</h3>
              {Object.keys(selectedService.attributeValues || {}).length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No category-specific attributes were provided for this service ad.</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(selectedService.attributeValues || {}).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{key}</p>
                      <p className="mt-2 text-sm text-white">{formatAttributeValue(value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {selectedService.status === 'ACTIVE' && (
              <section className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-300">Moderate This Ad</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Remove this service ad from the public feed if it violates platform rules. The record will remain
                  available for admin review.
                </p>

                <div className="mt-4">
                  <label className="mb-1 block text-xs font-medium text-slate-400">Removal reason</label>
                  <textarea
                    value={moderateReason}
                    onChange={(e) => setModerateReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-700/50 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-rose-500/50"
                    placeholder="Explain why this service ad is being removed..."
                  />
                </div>

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedService(null);
                      setModerateReason('');
                    }}
                    className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleModerate}
                    disabled={!moderateReason.trim() || submittingModeration}
                    className="rounded-lg bg-rose-600/15 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-600/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingModeration ? 'Removing...' : 'Remove Service Ad'}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </AdminModal>
    </div>
  );
};

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
    <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
      <span className="text-slate-400">{icon}</span>
      {label}
    </p>
    <p className="mt-2 text-sm text-white">{value}</p>
  </div>
);

export default AdminServicesPage;
