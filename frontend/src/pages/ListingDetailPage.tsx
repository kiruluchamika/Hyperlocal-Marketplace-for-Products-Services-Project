import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiCalendar,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiShoppingBag,
  FiTag,
} from 'react-icons/fi';
import { listingsApi } from '@/api/listings';
import { ordersApi } from '@/api/orders';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import { IProductListing } from '@/types';
import { formatCondition, formatCurrency, getListingImage, getOwnerContact, getOwnerId } from '@/utils/listings';

const ListingDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [listing, setListing] = React.useState<IProductListing | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeImage, setActiveImage] = React.useState(0);
  const [isOrdering, setIsOrdering] = React.useState(false);
  const [orderForm, setOrderForm] = React.useState({
    quantity: 1,
    deliveryMethod: 'PICKUP' as 'PICKUP' | 'DELIVERY',
    deliveryAddress: '',
    note: '',
  });

  React.useEffect(() => {
    const fetchListing = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await listingsApi.getById(id);
        setListing(data.data);
        setActiveImage(0);
      } catch {
        setError('Listing not found or currently unavailable.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void fetchListing();
    }
  }, [id]);

  const owner = listing ? getOwnerContact(listing.ownerId) : null;
  const isOwner = listing && user ? getOwnerId(listing.ownerId) === user.id : false;
  const images = listing?.images?.length ? listing.images : [listing ? getListingImage(listing) : ''];
  const canBuyNow = !!listing && listing.transactionMode === 'BUY_NOW' && !isOwner;

  const handleCreateOrder = async () => {
    if (!listing) {
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please sign in to place an order.');
      navigate('/login');
      return;
    }

    if (orderForm.deliveryMethod === 'DELIVERY' && orderForm.deliveryAddress.trim().length < 10) {
      toast.error('Please provide a delivery address with at least 10 characters.');
      return;
    }

    try {
      setIsOrdering(true);
      await ordersApi.create({
        listingId: listing._id,
        quantity: orderForm.quantity,
        deliveryMethod: orderForm.deliveryMethod,
        deliveryAddress: orderForm.deliveryMethod === 'DELIVERY' ? orderForm.deliveryAddress.trim() : undefined,
        note: orderForm.note.trim() || undefined,
      });

      toast.success('Order created successfully.');
      navigate('/dashboard/orders');
    } catch {
      setIsOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-slate-500">Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h1 className="text-2xl font-bold text-slate-800">Listing unavailable</h1>
            <p className="mt-2 text-sm text-slate-500">{error || 'This listing could not be loaded.'}</p>
            <div className="mt-4 flex gap-2">
              <Link to="/listings" className="btn-secondary">
                Back to Products
              </Link>
              <Button type="button" variant="primary" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700"
        >
          <FiArrowLeft size={16} /> Back to results
        </button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <img
                src={images[activeImage]}
                alt={listing.title}
                className="h-[420px] w-full rounded-xl object-cover"
              />

              {images.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-2 md:grid-cols-6">
                  {images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`overflow-hidden rounded-lg border ${
                        activeImage === index ? 'border-primary-500' : 'border-slate-200'
                      }`}
                    >
                      <img src={image} alt={`${listing.title} ${index + 1}`} className="h-16 w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary">{formatCondition(listing.condition)}</Badge>
                <Badge variant="neutral">{listing.transactionMode === 'BUY_NOW' ? 'Buy Now' : 'Negotiable'}</Badge>
                <Badge variant="info">{listing.status}</Badge>
              </div>

              <h1 className="mt-3 text-3xl font-bold text-slate-800">{listing.title}</h1>

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1"><FiTag size={14} /> {formatCurrency(listing.price, listing.currency)}</span>
                <span className="inline-flex items-center gap-1"><FiMapPin size={14} /> {listing.location.city}</span>
                <span className="inline-flex items-center gap-1"><FiCalendar size={14} /> {new Date(listing.createdAt).toLocaleDateString()}</span>
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{listing.description}</p>

              {listing.tags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {listing.tags.map((tag) => (
                    <Badge key={tag} variant="neutral">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-lg font-bold text-slate-800">Seller</h2>
              <p className="mt-2 text-sm font-semibold text-slate-700">{owner?.name || 'Seller'}</p>

              {owner?.email && (
                <a
                  href={`mailto:${owner.email}`}
                  className="mt-2 inline-flex items-center gap-2 text-sm text-primary-700"
                >
                  <FiMail size={14} /> {owner.email}
                </a>
              )}

              {owner?.phone && (
                <a
                  href={`tel:${owner.phone}`}
                  className="mt-2 block text-sm text-primary-700"
                >
                  <span className="inline-flex items-center gap-2"><FiPhone size={14} /> {owner.phone}</span>
                </a>
              )}

              <div className="mt-4 space-y-2">
                {isAuthenticated ? (
                  owner?.email ? (
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      leftIcon={<FiMessageCircle size={16} />}
                      onClick={() => window.open(`mailto:${owner.email}?subject=Regarding ${listing.title}`, '_blank')}
                    >
                      Message Seller
                    </Button>
                  ) : (
                    <p className="text-sm text-slate-500">Seller contact details are limited for this listing.</p>
                  )
                ) : (
                  <Link to="/login" className="btn-secondary block w-full text-center">
                    Sign in to contact seller
                  </Link>
                )}
              </div>

              {isOwner && <p className="mt-3 text-xs font-medium text-amber-700">You are the owner of this listing.</p>}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-lg font-bold text-slate-800">Buy Now</h2>
              {!canBuyNow && (
                <p className="mt-2 text-sm text-slate-500">
                  {isOwner
                    ? 'You cannot place an order on your own listing.'
                    : listing.transactionMode === 'NEGOTIABLE'
                    ? 'This listing is negotiable. Please contact seller to proceed.'
                    : 'Sign in to place an order.'}
                </p>
              )}

              {canBuyNow && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={orderForm.quantity}
                      onChange={(event) =>
                        setOrderForm((prev) => ({ ...prev, quantity: Math.max(1, Number(event.target.value) || 1) }))
                      }
                      className="input-field py-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Delivery Method</label>
                    <select
                      value={orderForm.deliveryMethod}
                      onChange={(event) =>
                        setOrderForm((prev) => ({
                          ...prev,
                          deliveryMethod: event.target.value as 'PICKUP' | 'DELIVERY',
                        }))
                      }
                      className="input-field py-2"
                    >
                      <option value="PICKUP">Pickup</option>
                      <option value="DELIVERY">Delivery</option>
                    </select>
                  </div>

                  {orderForm.deliveryMethod === 'DELIVERY' && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Delivery Address</label>
                      <textarea
                        value={orderForm.deliveryAddress}
                        onChange={(event) => setOrderForm((prev) => ({ ...prev, deliveryAddress: event.target.value }))}
                        rows={3}
                        className="input-field py-2"
                        placeholder="Enter full delivery address"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Note (optional)</label>
                    <textarea
                      value={orderForm.note}
                      onChange={(event) => setOrderForm((prev) => ({ ...prev, note: event.target.value }))}
                      rows={2}
                      className="input-field py-2"
                      placeholder="Any special request"
                    />
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    Total: <span className="font-bold">{formatCurrency(listing.price * orderForm.quantity, listing.currency)}</span>
                  </div>

                  <Button
                    type="button"
                    fullWidth
                    isLoading={isOrdering}
                    onClick={handleCreateOrder}
                    leftIcon={<FiShoppingBag size={16} />}
                  >
                    Place Order
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetailPage;
