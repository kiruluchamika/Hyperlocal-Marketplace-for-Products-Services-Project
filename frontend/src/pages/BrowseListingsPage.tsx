import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiChevronDown,
  FiChevronUp,
  FiCrosshair,
  FiMapPin,
  FiSearch,
  FiSliders,
} from 'react-icons/fi';
import GeoMapCanvas from '@/components/map/GeoMapCanvas';
import { listingsApi } from '@/api/listings';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useCategoryStore } from '@/store/categoryStore';
import { GeoNearbyItem, IProductListing } from '@/types';
import { formatCondition, formatCurrency, getListingImage } from '@/utils/listings';

type SortOption = 'recent' | 'priceAsc' | 'priceDesc';

const conditionOptions = [
  { label: 'Any Condition', value: '' },
  { label: 'Brand New', value: 'NEW' },
  { label: 'Used - Like New', value: 'USED_LIKE_NEW' },
  { label: 'Used - Good', value: 'USED_GOOD' },
  { label: 'Used - Fair', value: 'USED_FAIR' },
];

const sortOptions: { label: string; value: SortOption }[] = [
  { label: 'Most Recent', value: 'recent' },
  { label: 'Price: Low to High', value: 'priceAsc' },
  { label: 'Price: High to Low', value: 'priceDesc' },
];

const SRI_LANKAN_DISTRICTS: { name: string; lat: number; lng: number }[] = [
  { name: 'Ampara', lat: 7.2917, lng: 81.6725 },
  { name: 'Anuradhapura', lat: 8.3114, lng: 80.4037 },
  { name: 'Badulla', lat: 6.9895, lng: 81.055 },
  { name: 'Batticaloa', lat: 7.717, lng: 81.7 },
  { name: 'Colombo', lat: 6.9271, lng: 79.8612 },
  { name: 'Galle', lat: 6.0535, lng: 80.221 },
  { name: 'Gampaha', lat: 7.0917, lng: 79.9999 },
  { name: 'Hambantota', lat: 6.1241, lng: 81.1185 },
  { name: 'Jaffna', lat: 9.6615, lng: 80.0255 },
  { name: 'Kalutara', lat: 6.5831, lng: 79.9593 },
  { name: 'Kandy', lat: 7.2906, lng: 80.6337 },
  { name: 'Kegalle', lat: 7.2513, lng: 80.3464 },
  { name: 'Kilinochchi', lat: 9.3803, lng: 80.377 },
  { name: 'Kurunegala', lat: 7.4863, lng: 80.3647 },
  { name: 'Mannar', lat: 8.977, lng: 79.909 },
  { name: 'Matale', lat: 7.4675, lng: 80.6234 },
  { name: 'Matara', lat: 5.9549, lng: 80.555 },
  { name: 'Monaragala', lat: 6.8728, lng: 81.3507 },
  { name: 'Mullaitivu', lat: 9.2675, lng: 80.8144 },
  { name: 'Nuwara Eliya', lat: 6.9497, lng: 80.7891 },
  { name: 'Polonnaruwa', lat: 7.9403, lng: 81.0188 },
  { name: 'Puttalam', lat: 8.033, lng: 79.8262 },
  { name: 'Ratnapura', lat: 6.6828, lng: 80.3992 },
  { name: 'Trincomalee', lat: 8.5874, lng: 81.2152 },
  { name: 'Vavuniya', lat: 8.7514, lng: 80.4971 },
];

const parseNumber = (value: string | null) => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const sortListings = (listings: IProductListing[], sort: SortOption) => {
  const cloned = [...listings];

  if (sort === 'priceAsc') {
    return cloned.sort((a, b) => a.price - b.price);
  }

  if (sort === 'priceDesc') {
    return cloned.sort((a, b) => b.price - a.price);
  }

  return cloned.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const toGeoItem = (listing: IProductListing): GeoNearbyItem | null => {
  const coords = listing.location?.coordinates?.coordinates;

  if (!coords || coords.length !== 2) {
    return null;
  }

  const [lng, lat] = coords;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const category = typeof listing.categoryId === 'string' ? '' : (listing.categoryId?.name || '');

  return {
    id: listing._id,
    type: 'PRODUCT',
    title: listing.title,
    description: listing.description,
    price: listing.price,
    city: listing.location.city,
    distance: 0,
    sellerId: typeof listing.ownerId === 'string' ? listing.ownerId : listing.ownerId?.id || '',
    categoryId: typeof listing.categoryId === 'string' ? listing.categoryId : listing.categoryId?._id || '',
    location: { coordinates: [lat, lng], text: `${listing.location.city} ${category}`.trim() },
    condition: listing.condition,
    images: listing.images,
  };
};

const BrowseListingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [center, setCenter] = React.useState<[number, number]>([6.9271, 79.8612]);
  const [isMapOpen, setIsMapOpen] = React.useState(true);
  const [searchInput, setSearchInput] = React.useState(searchParams.get('searchTerm') || '');
  const [filters, setFilters] = React.useState({
    searchTerm: searchParams.get('searchTerm') || '',
    categoryId: searchParams.get('categoryId') || '',
    condition: searchParams.get('condition') || '',
    city: searchParams.get('city') || '',
    minPrice: parseNumber(searchParams.get('minPrice')),
    maxPrice: parseNumber(searchParams.get('maxPrice')),
    sort: (searchParams.get('sort') as SortOption) || 'recent',
  });
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<IProductListing[]>([]);
  const [selectedItemId, setSelectedItemId] = React.useState<string | undefined>();
  const [locationSource, setLocationSource] = React.useState<'district' | 'live' | ''>('');

  const { productCategories, fetchCategories } = useCategoryStore();

  React.useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, searchTerm: searchInput.trim() }));
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (filters.searchTerm) params.set('searchTerm', filters.searchTerm);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.condition) params.set('condition', filters.condition);
    if (filters.city) params.set('city', filters.city);
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    if (filters.sort !== 'recent') params.set('sort', filters.sort);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  React.useEffect(() => {
    const fetchListings = async () => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      try {
        const { data } = await listingsApi.getAll({
          page,
          limit: 12,
          categoryId: filters.categoryId || undefined,
          condition: (filters.condition as IProductListing['condition']) || undefined,
          city: filters.city || undefined,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          searchTerm: filters.searchTerm || undefined,
        });

        const incoming = data.data || [];
        setPagination(data.pagination || { page: 1, limit: 12, total: incoming.length, totalPages: 1 });

        if (page === 1) {
          setResults(sortListings(incoming, filters.sort));
        } else {
          setResults((prev) => {
            const merged = [...prev];
            for (const item of incoming) {
              if (!merged.some((existing) => existing._id === item._id)) {
                merged.push(item);
              }
            }
            return sortListings(merged, filters.sort);
          });
        }
      } catch {
        setError('Unable to load products right now. Please try again.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    void fetchListings();
  }, [filters, page]);

  React.useEffect(() => {
    if (page === 1) {
      return;
    }

    setPage(1);
  }, [filters, page]);

  const mapItems = React.useMemo(() => {
    return results.map(toGeoItem).filter((item): item is GeoNearbyItem => !!item);
  }, [results]);

  React.useEffect(() => {
    if (mapItems.length === 0) {
      return;
    }

    const first = mapItems[0];
    if (first.location?.coordinates) {
      setCenter(first.location.coordinates);
    }
  }, [mapItems]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter([position.coords.latitude, position.coords.longitude]);
        setIsMapOpen(true);
        setLocationSource('live');
        toast.success('Location updated.');
      },
      () => {
        toast.error('Location permission denied. You can click the map to set location.');
      }
    );
  };

  const onDistrictChange = (districtName: string) => {
    const district = SRI_LANKAN_DISTRICTS.find((item) => item.name === districtName);

    setFilters((prev) => ({ ...prev, city: districtName }));
    setPage(1);

    if (district) {
      setCenter([district.lat, district.lng]);
      setLocationSource('district');
      setIsMapOpen(true);
    }
  };

  const onLoadMore = () => {
    if (loadingMore || page >= pagination.totalPages) {
      return;
    }

    setPage((prev) => prev + 1);
  };

  const onResetFilters = () => {
    setSearchInput('');
    setFilters({
      searchTerm: '',
      categoryId: '',
      condition: '',
      city: '',
      minPrice: undefined,
      maxPrice: undefined,
      sort: 'recent',
    });
    setPage(1);
  };

  const hasNext = page < pagination.totalPages;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 py-10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-1 lg:sticky lg:top-24 lg:h-fit">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Browse Products</h1>
            <p className="mt-1 text-sm text-slate-500">Search, filter, and discover products quickly with a clear browsing flow.</p>
          </div>

          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              type="search"
              className="input-field py-2 pl-9"
              placeholder="Search by title or description"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={filters.city}
              onChange={(event) => onDistrictChange(event.target.value)}
              className="input-field py-2"
            >
              <option value="">All Districts</option>
              {SRI_LANKAN_DISTRICTS.map((district) => (
                <option key={district.name} value={district.name}>
                  {district.name}
                </option>
              ))}
            </select>
            <select
              value={filters.categoryId}
              onChange={(event) => {
                setFilters((prev) => ({ ...prev, categoryId: event.target.value }));
                setPage(1);
              }}
              className="input-field py-2"
            >
              <option value="">All Categories</option>
              {productCategories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Min price</label>
              <input
                value={filters.minPrice ?? ''}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, minPrice: parseNumber(event.target.value) }));
                  setPage(1);
                }}
                type="number"
                min={0}
                className="input-field py-2"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Max price</label>
              <input
                value={filters.maxPrice ?? ''}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, maxPrice: parseNumber(event.target.value) }));
                  setPage(1);
                }}
                type="number"
                min={0}
                className="input-field py-2"
                placeholder="Any"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={filters.condition}
              onChange={(event) => {
                setFilters((prev) => ({ ...prev, condition: event.target.value }));
                setPage(1);
              }}
              className="input-field py-2"
            >
              {conditionOptions.map((option) => (
                <option key={option.value || 'default'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={filters.sort}
              onChange={(event) => {
                setFilters((prev) => ({ ...prev, sort: event.target.value as SortOption }));
                setPage(1);
              }}
              className="input-field py-2"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onResetFilters}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setIsMapOpen((prev) => !prev)}
              leftIcon={<FiSliders size={14} />}
            >
              {isMapOpen ? 'Hide Map' : 'Show Map'}
            </Button>
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <FiCrosshair size={16} /> Use My Location
          </button>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-600">
              {locationSource === 'live'
                ? `Using live location (${center[0].toFixed(5)}, ${center[1].toFixed(5)})`
                : locationSource === 'district'
                ? `Using district center (${center[0].toFixed(5)}, ${center[1].toFixed(5)})`
                : 'Pick a district or use live location for map-based browsing.'}
            </p>
          </div>

          <Link to="/" className="btn-secondary inline-block w-full text-center">
            &larr; Back to Home
          </Link>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <button
            type="button"
            onClick={() => setIsMapOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700"
          >
            {isMapOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            {isMapOpen ? 'Collapse map view' : 'Expand map view'}
          </button>

          {isMapOpen && (
            <GeoMapCanvas
              center={center}
              radiusKm={5}
              items={mapItems}
              selectedItemId={selectedItemId}
              onCenterChange={setCenter}
              onSelectItem={(item) => setSelectedItemId(item.id)}
            />
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                {pagination.total.toLocaleString()} products • Showing {results.length}
              </p>
              <Badge variant="info">Page {pagination.page} of {pagination.totalPages}</Badge>
            </div>

            {loading && <p className="py-6 text-sm text-slate-500">Loading nearby products...</p>}
            {error && !loading && <p className="py-6 text-sm text-rose-600">{error}</p>}

            {!loading && !error && results.length === 0 && (
              <p className="py-6 text-sm text-slate-500">No products found. Adjust filters or try another search.</p>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {results.map((item) => (
                <Link
                  key={item._id}
                  to={`/listings/${item._id}`}
                  onMouseEnter={() => setSelectedItemId(item._id)}
                  className={`block rounded-xl border p-3 transition-colors ${
                    selectedItemId === item._id ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={getListingImage(item)}
                    alt={item.title}
                    className="mb-3 h-44 w-full rounded-lg object-cover"
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatCondition(item.condition)}</p>
                      <div className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600">
                        <FiMapPin size={12} /> {item.location?.city || 'City not available'}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(item.price, item.currency)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {!loading && !error && results.length > 0 && (
              <div className="mt-4 flex items-center justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onLoadMore}
                  isLoading={loadingMore}
                  disabled={!hasNext}
                >
                  {hasNext ? 'Load More Products' : 'No More Products'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseListingsPage;
