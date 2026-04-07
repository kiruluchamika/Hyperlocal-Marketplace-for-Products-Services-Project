import React from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiEdit2, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi';
import { listingsApi } from '@/api/listings';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import { IProductListing } from '@/types';
import { formatCondition, formatCurrency, getListingImage } from '@/utils/listings';

const MyListingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [listings, setListings] = React.useState<IProductListing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState('');

  const fetchMyListings = React.useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await listingsApi.getMyActive();
      setListings(response.data.data);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    void fetchMyListings();
  }, [fetchMyListings]);

  const onDelete = async (id: string) => {
    const approved = window.confirm('Delete this listing? This action hides it from buyers.');
    if (!approved) {
      return;
    }

    try {
      setDeletingId(id);
      await listingsApi.delete(id);
      setListings((prev) => prev.filter((listing) => listing._id !== id));
      toast.success('Listing deleted successfully.');
    } catch {
      return;
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Listings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your active product listings and keep details up to date.</p>
        </div>
        <Link to="/dashboard/listings/new" className="btn-primary inline-flex items-center gap-2 text-sm">
          <FiPlus size={16} /> Add New Listing
        </Link>
      </div>

      {loading && <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading your listings...</p>}

      {!loading && listings.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">No active listings found</h2>
          <p className="mt-2 text-sm text-slate-500">
            Create your first listing to start selling. Only active listings are shown here.
          </p>
          <Link to="/dashboard/listings/new" className="btn-secondary mt-4 inline-block">
            Create Listing
          </Link>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <div key={listing._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <img
                src={getListingImage(listing)}
                alt={listing.title}
                className="h-44 w-full rounded-xl object-cover"
              />

              <div className="mt-3 flex items-center justify-between gap-2">
                <h3 className="truncate text-base font-semibold text-slate-800">{listing.title}</h3>
                <Badge variant={listing.status === 'SUSPENDED' ? 'danger' : listing.status === 'UNDER_REVIEW' ? 'warning' : 'info'}>
                  {listing.status}
                </Badge>
              </div>

              {listing.status === 'SUSPENDED' && (
                <div className="mt-3 rounded-lg bg-red-50 p-3 shadow-sm border border-red-100">
                  <div className="flex gap-2 text-red-800">
                    <FiEye className="mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold">Listing Suspended</p>
                      <p className="mt-1 font-medium">{listing.suspendReason || 'A violation was detected.'}</p>
                      {listing.suspendDeadline && (
                        <p className="mt-1 text-red-600 font-semibold">
                          Edit before: {new Date(listing.suspendDeadline).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {listing.status === 'UNDER_REVIEW' && (
                <div className="mt-3 rounded-lg bg-amber-50 p-2 shadow-sm border border-amber-100 text-xs text-amber-800">
                  <span className="font-semibold">Review Pending:</span> Your edits have been submitted for admin approval.
                </div>
              )}

              <p className="mt-2 text-sm font-semibold text-slate-700">{formatCurrency(listing.price, listing.currency)}</p>
              <p className="mt-1 text-xs text-slate-500">{formatCondition(listing.condition)}</p>
              <p className="mt-1 text-xs text-slate-500">{listing.location?.city || 'City not available'}</p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Link
                  to={`/listings/${listing._id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <FiEye size={14} />
                </Link>
                <Link
                  to={`/dashboard/listings/new?edit=${listing._id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-primary-200 px-2 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                >
                  <FiEdit2 size={14} />
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  className="!rounded-lg !px-2 !py-2"
                  isLoading={deletingId === listing._id}
                  onClick={() => void onDelete(listing._id)}
                >
                  <FiTrash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyListingsPage;
