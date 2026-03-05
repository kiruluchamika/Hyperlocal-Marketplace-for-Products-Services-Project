import React, { useEffect, useState, useCallback } from 'react';
import { servicesApi } from '@/api/services';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/admin/AdminTable';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import AdminBadge, { getStatusVariant } from '@/components/admin/AdminBadge';
import AdminModal from '@/components/admin/AdminModal';
import toast from 'react-hot-toast';

interface ServiceRow {
  _id: string;
  title: string;
  description: string;
  price: number;
  pricingType: string;
  locationText: string;
  images: string[];
  status: string;
  sellerId: { _id: string; name: string; email: string } | string;
  categoryId: { _id: string; name: string } | string;
  createdAt: string;
}

const AdminServicesPage: React.FC = () => {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(null);
  const [moderateReason, setModerateReason] = useState('');

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await servicesApi.getAllAdmin({ search: search || undefined });
      setServices(res.data.services as unknown as ServiceRow[]);
    } catch {
      // global
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchServices(), 300);
    return () => clearTimeout(timer);
  }, [fetchServices]);

  const handleModerate = async () => {
    if (!selectedService || !moderateReason.trim()) return;
    try {
      await servicesApi.moderate(selectedService._id, moderateReason);
      toast.success('Service moderated successfully');
      setSelectedService(null);
      setModerateReason('');
      fetchServices();
    } catch {
      // global
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Service',
      render: (row: ServiceRow) => (
        <div className="flex items-center gap-3">
          {row.images?.[0] ? (
            <img src={row.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-slate-800 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-white max-w-[200px]">{row.title}</p>
            <p className="text-xs text-slate-500">{row.locationText}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'seller',
      header: 'Seller',
      render: (row: ServiceRow) => {
        const seller = typeof row.sellerId === 'object' ? row.sellerId : null;
        return seller ? (
          <div>
            <p className="text-sm text-white">{seller.name}</p>
            <p className="text-xs text-slate-500">{seller.email}</p>
          </div>
        ) : <span className="text-slate-500">—</span>;
      },
    },
    {
      key: 'price',
      header: 'Price',
      render: (row: ServiceRow) => (
        <span className="font-medium text-white">
          LKR {row.price?.toLocaleString()}
          <span className="text-xs text-slate-500 ml-1">/{row.pricingType?.toLowerCase()}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ServiceRow) => (
        <AdminBadge variant={getStatusVariant(row.status)}>{row.status}</AdminBadge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: ServiceRow) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedService(row); }}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          Manage
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Services" description="Manage service listings and moderate content" />

      <div className="w-full max-w-sm">
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Search services..." />
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50">
        <AdminTable columns={columns} data={services} loading={loading} emptyMessage="No services found" />
      </div>

      {/* Moderate Modal */}
      <AdminModal isOpen={!!selectedService} onClose={() => { setSelectedService(null); setModerateReason(''); }} title="Moderate Service" size="md">
        {selectedService && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-white">{selectedService.title}</p>
              <p className="mt-1 text-xs text-slate-400">{selectedService.description?.slice(0, 200)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-400">Current Status</p>
              <AdminBadge variant={getStatusVariant(selectedService.status)}>{selectedService.status}</AdminBadge>
            </div>
            {selectedService.status === 'ACTIVE' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Removal Reason</label>
                  <textarea
                    value={moderateReason}
                    onChange={(e) => setModerateReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/50"
                    placeholder="Reason for removing this service..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setSelectedService(null); setModerateReason(''); }}
                    className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleModerate}
                    disabled={!moderateReason.trim()}
                    className="rounded-lg bg-rose-600/15 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-600/25 disabled:opacity-50"
                  >
                    Remove Service
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </AdminModal>
    </div>
  );
};

export default AdminServicesPage;
