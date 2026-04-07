import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { FiClock, FiDownload, FiFileText, FiMapPin, FiStar, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { servicesApi } from '@/api/services';
import AdminBadge, { getStatusVariant } from '@/components/admin/AdminBadge';
import AdminModal from '@/components/admin/AdminModal';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import AdminTable from '@/components/admin/AdminTable';
import ServiceReportModal from '@/components/admin/ServiceReportModal';
import type { IServiceSelling } from '@/types';
import {
  generateAdminServicesPdf,
  type ServiceReportOptions,
} from '@/utils/adminServiceReport';

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
        image?: string;
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

const getServiceDisplayImage = (service: AdminServiceRow) =>
  service.displayImage ||
  service.images?.find((image) => !!image) ||
  (typeof service.categoryId === 'object' ? service.categoryId?.image : undefined) ||
  '/images/default-service.svg';

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
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

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
      { label: 'Total Services', value: services.length, tone: 'text-slate-900' },
      { label: 'Active Ads', value: active, tone: 'text-emerald-600' },
      { label: 'Removed Ads', value: removed, tone: 'text-amber-600' },
      { label: 'Deleted Ads', value: deleted, tone: 'text-rose-600' },
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

  const exportCsv = () => {
    if (services.length === 0) {
      toast.error('No services found to export.');
      return;
    }

    setCsvLoading(true);
    try {
      const headers = [
        'Title',
        'Owner',
        'Owner Email',
        'Category',
        'Price',
        'Pricing Type',
        'Location',
        'Status',
        'Views',
        'Created Date',
      ];

      const rows = services.map((row) => {
        const seller = getSeller(row);
        return [
          row.title || '',
          seller?.name || getSellerId(row),
          seller?.email || '',
          getCategoryName(row),
          String(row.price ?? 0),
          row.pricingType || '',
          row.location?.city || row.locationText || '',
          row.status || '',
          String(row.viewsCount ?? 0),
          format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm'),
        ];
      });

      const csv = [headers, ...rows]
        .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `bazzoro-services-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);

      toast.success('CSV report downloaded.');
    } finally {
      setCsvLoading(false);
    }
  };

  const generatePdf = async (options: ServiceReportOptions) => {
    if (services.length === 0) {
      toast.error('No services available to generate report.');
      return;
    }

    setPdfLoading(true);
    try {
      await generateAdminServicesPdf({
        services,
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
      header: 'Service Ad',
      render: (row: AdminServiceRow) => (
        <button
          type="button"
          onClick={() => openDetails(row)}
          className="flex w-full items-center gap-3 text-left"
        >
          <img
            src={getServiceDisplayImage(row)}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/images/default-service.svg';
            }}
          />
          <div className="min-w-0">
            <p className="max-w-[240px] truncate font-medium text-slate-900">{row.title}</p>
            <p className="truncate text-xs text-slate-600">
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
            <p className="text-sm text-slate-900">{seller.name || 'Unknown user'}</p>
            <p className="text-xs text-slate-600">{seller.email || getSellerId(row)}</p>
          </div>
        ) : (
          <span className="text-slate-500">{getSellerId(row)}</span>
        );
      },
    },
    {
      key: 'price',
      header: 'Pricing',
      render: (row: AdminServiceRow) => (
        <div>
          <p className="font-medium text-slate-900">LKR {row.price?.toLocaleString()}</p>
          <p className="text-xs uppercase tracking-wide text-slate-600">{row.pricingType}</p>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (row: AdminServiceRow) => (
        <div>
          <p className="inline-flex items-center gap-1 font-medium text-slate-900">
            <FiStar size={13} className="text-amber-500" /> {(row.averageRating || 0).toFixed(1)}
          </p>
          <p className="text-xs text-slate-600">{row.reviewCount || 0} reviews</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row: AdminServiceRow) => (
        <span className="text-sm text-slate-600">{row.location?.city || row.locationText || 'Not set'}</span>
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
        <span className="text-xs text-slate-500">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
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
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {serviceStats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-600">{stat.label}</p>
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
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="REMOVED">Removed</option>
          <option value="DELETED">Deleted</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <AdminTable columns={columns} data={services} loading={loading} emptyMessage="No service ads found" />
      </div>

      <AdminModal
        isOpen={!!selectedService}
        onClose={() => {
          setSelectedService(null);
          setModerateReason('');
        }}
        title="Service Ad Details"
        size="lg"
      >
        {selectedService && (
          <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div>
                <img
                  src={getServiceDisplayImage(selectedService)}
                  alt={selectedService.title}
                  className="h-52 w-full rounded-2xl object-cover"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/images/default-service.svg';
                  }}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminBadge variant={getStatusVariant(selectedService.status)}>{selectedService.status}</AdminBadge>
                  <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700">
                    {getCategoryName(selectedService)}
                  </span>
                  <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700">
                    {selectedService.pricingType}
                  </span>
                </div>

                <h2 className="mt-3 text-2xl font-semibold text-slate-900">{selectedService.title}</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
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
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Owner Details</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="mt-1 text-slate-900">{getSeller(selectedService)?.name || 'Unknown user'}</p>
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

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Moderation State</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div>
                    <p className="text-xs text-slate-500">Current status</p>
                    <div className="mt-1">
                      <AdminBadge variant={getStatusVariant(selectedService.status)}>{selectedService.status}</AdminBadge>
                    </div>
                  </div>

                  {selectedService.removedReason && (
                    <div>
                      <p className="text-xs text-slate-500">Removal reason</p>
                      <p className="mt-1 text-amber-700">{selectedService.removedReason}</p>
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

                  <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">
                    Admin supervises service ads and booking records, but does not accept bookings, pay deposits, or
                    manually complete the normal booking lifecycle.
                  </p>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Category Attributes</h3>
              {Object.keys(selectedService.attributeValues || {}).length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No category-specific attributes were provided for this service ad.</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(selectedService.attributeValues || {}).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{key}</p>
                      <p className="mt-2 text-sm text-slate-900">{formatAttributeValue(value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {selectedService.status === 'ACTIVE' && (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">Moderate This Ad</h3>
                <p className="mt-2 text-sm text-slate-700">
                  Remove this service ad from the public feed if it violates platform rules. The record will remain
                  available for admin review.
                </p>

                <div className="mt-4">
                  <label className="mb-1 block text-xs font-medium text-slate-700">Removal reason</label>
                  <textarea
                    value={moderateReason}
                    onChange={(e) => setModerateReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-rose-500/50"
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
                    className="rounded-lg px-4 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleModerate}
                    disabled={!moderateReason.trim() || submittingModeration}
                    className="rounded-lg bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingModeration ? 'Removing...' : 'Remove Service Ad'}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </AdminModal>

      <ServiceReportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onGenerate={generatePdf}
        isGenerating={pdfLoading}
      />
    </div>
  );
};

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
      <span className="text-slate-400">{icon}</span>
      {label}
    </p>
    <p className="mt-2 text-sm text-slate-900">{value}</p>
  </div>
);

export default AdminServicesPage;