import React from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiHeart, FiMapPin, FiTag, FiTrash2 } from 'react-icons/fi';
import { listingsApi } from '@/api/listings';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { IProductListing } from '@/types';
import { formatCurrency, getListingImage } from '@/utils/listings';

const WishlistPage: React.FC = () => {
  const [wishlist, setWishlist] = React.useState<IProductListing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [removingId, setRemovingId] = React.useState('');

  const fetchWishlist = React.useCallback(async () => {
    setLoading(true);

    try {
      const response = await listingsApi.getMyWishlist();
      setWishlist(response.data.data);
    } catch {
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchWishlist();
  }, [fetchWishlist]);

  const handleRemove = async (listingId: string) => {
    try {
      setRemovingId(listingId);
      await listingsApi.removeFromWishlist(listingId);
      setWishlist((prev) => prev.filter((listing) => listing._id !== listingId));
      toast.success('Removed from wishlist.');
    } catch {
      return;
    } finally {
      setRemovingId('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Wishlist</h1>
          <p className="mt-1 text-sm text-slate-500">
            Keep track of the product ads you want to revisit and compare later.
          </p>
        </div>
        <Badge variant="info" size="md" className="self-start">
          {wishlist.length} saved item{wishlist.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {loading && (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-card">
          Loading your wishlist...
        </p>
      )}

      {!loading && wishlist.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <FiHeart size={24} />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-slate-800">You haven&apos;t saved any products yet.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Browse nearby listings and tap the heart on any product ad to keep it here for later.
          </p>
          <Link to="/listings" className="btn-secondary mt-6 inline-flex items-center gap-2">
            Browse Products
          </Link>
        </div>
      )}

      {!loading && wishlist.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {wishlist.map((listing) => {
            const categoryName =
              typeof listing.categoryId === 'string' ? '' : listing.categoryId?.name || '';
            const isActive = listing.status === 'ACTIVE';

            return (
              <div key={listing._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
                <img
                  src={getListingImage(listing)}
                  alt={listing.title}
                  className="h-48 w-full object-cover"
                />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="line-clamp-2 text-lg font-semibold text-slate-800">{listing.title}</h2>
                      <p className="mt-2 text-base font-bold text-slate-900">
                        {formatCurrency(listing.price, listing.currency)}
                      </p>
                    </div>
                    <Badge variant={isActive ? 'success' : 'neutral'}>{listing.status}</Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-500">
                    {categoryName && (
                      <p className="inline-flex items-center gap-2">
                        <FiTag size={14} /> {categoryName}
                      </p>
                    )}
                    {listing.location?.city && (
                      <p className="inline-flex items-center gap-2">
                        <FiMapPin size={14} /> {listing.location.city}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">{listing.savedCount ?? 0} saves</p>
                  </div>

                  <div className="mt-5 flex gap-3">
                    {isActive ? (
                      <Link to={`/listings/${listing._id}`} className="btn-secondary flex-1 text-center">
                        View Product
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-400"
                      >
                        Unavailable
                      </button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      className="!min-h-12 !px-4 text-rose-600 hover:!bg-rose-50"
                      isLoading={removingId === listing._id}
                      onClick={() => void handleRemove(listing._id)}
                    >
                      <FiTrash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
