import React from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiEdit2, FiMapPin, FiPlus, FiTrash2 } from 'react-icons/fi';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import StarRating from '@/components/reviews/StarRating';
import { servicesApi } from '@/api/services';
import { IServiceSelling } from '@/types';
import { formatCurrency } from '@/utils/listings';

const getServiceImage = (service: IServiceSelling) => {
  if (Array.isArray(service.images) && service.images.length > 0 && service.images[0]) {
    return service.images[0];
  }

  return 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80';
};

const getCategoryName = (category: IServiceSelling['categoryId']) => {
  if (typeof category === 'string') {
    return 'Service Category';
  }

  return category?.name || 'Service Category';
};

const MyPostedServicesPage: React.FC = () => {
  const [services, setServices] = React.useState<IServiceSelling[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState('');

  const fetchServices = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await servicesApi.getMyServices();
      setServices(data.data || []);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const handleDelete = async (serviceId: string) => {
    const approved = window.confirm('Delete this service ad? It will be hidden from the public feed.');
    if (!approved) {
      return;
    }

    try {
      setDeletingId(serviceId);
      await servicesApi.delete(serviceId);
      setServices((prev) => prev.filter((service) => service._id !== serviceId));
      toast.success('Service ad deleted successfully.');
    } catch {
      return;
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Posted Services</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review the service ads you have published, removed, or deleted.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/dashboard/services" className="btn-secondary inline-flex items-center gap-2 text-sm">
            <FiArrowLeft size={16} /> Back to Requests
          </Link>
          <Link to="/dashboard/services/new" className="btn-primary inline-flex items-center gap-2 text-sm">
            <FiPlus size={16} /> Post Service
          </Link>
        </div>
      </div>

      {loading && (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading your service ads...
        </p>
      )}

      {!loading && services.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">No service ads yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Post your first service to start receiving booking requests from buyers.
          </p>
          <Link to="/dashboard/services/new" className="btn-secondary mt-4 inline-block">
            Create Service Ad
          </Link>
        </div>
      )}

      {!loading && services.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <div key={service._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <img src={getServiceImage(service)} alt={service.title} className="h-48 w-full object-cover" />

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary-600">
                      {getCategoryName(service.categoryId)}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-800">{service.title}</h2>
                  </div>
                  <Badge variant={service.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {service.status}
                  </Badge>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-slate-500">{service.description}</p>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-500">Rating</span>
                    <span className="inline-flex items-center gap-2 text-slate-700">
                      <StarRating rating={service.averageRating || 0} size="sm" />
                      <span className="font-semibold">{(service.averageRating || 0).toFixed(1)}</span>
                      <span className="text-xs text-slate-500">({service.reviewCount || 0})</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-500">Price</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(service.price)}
                      {service.pricingType === 'HOURLY' ? ' / hour' : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-500">Location</span>
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      <FiMapPin size={13} /> {service.locationText}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Link
                    to={`/dashboard/services/new?edit=${service._id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary-200 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                  >
                    <FiEdit2 size={14} /> Edit Service
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    className="!rounded-lg !px-3 !py-2"
                    isLoading={deletingId === service._id}
                    onClick={() => void handleDelete(service._id)}
                  >
                    <FiTrash2 size={14} /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPostedServicesPage;
