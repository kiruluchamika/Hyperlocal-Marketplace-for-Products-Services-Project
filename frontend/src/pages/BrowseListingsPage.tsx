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
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const sortListings = (listings: IProductListing[], sort: SortOption) => {
  const cloned = [...listings];

  if (sort === 'priceAsc') return cloned.sort((a, b) => a.price - b.price);
  if (sort === 'priceDesc') return cloned.sort((a, b) => b.price - a.price);

  return cloned.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const toGeoItem = (listing: IProductListing): GeoNearbyItem | null => {
  const coords = listing.location?.coordinates?.coordinates;
  if (!coords || coords.length !== 2) return null;

  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const category = typeof listing.categoryId === 'string' ? '' : listing.categoryId?.name || '';

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
  const [isBrowseOpen, setIsBrowseOpen] = React.useState(false);
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
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

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
    if (page !== 1) setPage(1);
  }, [filters]);

  const mapItems = React.useMemo(() => results.map(toGeoItem).filter((item): item is GeoNearbyItem => !!item), [results]);

  React.useEffect(() => {
    if (mapItems.length === 0) return;
    const first = mapItems[0];
    if (first.location?.coordinates) setCenter(first.location.coordinates);
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
      () => toast.error('Location permission denied. You can click the map to set location.')
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
    if (!loadingMore && page < pagination.totalPages) {
      setPage((prev) => prev + 1);
    }
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
    setLocationSource('');
  };

  return (
    <div className="min-h-screen bg-transparent py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-card backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                type="search"
                className="input-field rounded-2xl py-3 pl-11"
                placeholder="Search products by title or description"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" leftIcon={<FiSliders size={14} />} onClick={() => setIsBrowseOpen((prev) => !prev)}>
                {isBrowseOpen ? 'Hide Browse' : 'Browse'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsMapOpen((prev) => !prev)}>
                {isMapOpen ? 'Hide Map' : 'Show Map'}
              </Button>
              <Button type="button" variant="secondary" size="sm" leftIcon={<FiCrosshair size={14} />} onClick={useCurrentLocation}>
                Use My Location
              </Button>
            </div>
          </div>

          {isBrowseOpen && (
            <div className="mt-4 rounded-[22px] border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                <select value={filters.city} onChange={(event) => onDistrictChange(event.target.value)} className="input-field py-2.5">
                  <option value="">All Districts</option>
                  {SRI_LANKAN_DISTRICTS.map((district) => (
                    <option key={district.name} value={district.name}>
                      {district.name}
                    </option>
                  ))}
                </select>
                <select value={filters.categoryId} onChange={(event) => { setFilters((prev) => ({ ...prev, categoryId: event.target.value })); setPage(1); }} className="input-field py-2.5">
                  <option value="">All Categories</option>
                  {productCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input value={filters.minPrice ?? ''} onChange={(event) => { setFilters((prev) => ({ ...prev, minPrice: parseNumber(event.target.value) })); setPage(1); }} type="number" min={0} className="input-field py-2.5" placeholder="Min price" />
                <input value={filters.maxPrice ?? ''} onChange={(event) => { setFilters((prev) => ({ ...prev, maxPrice: parseNumber(event.target.value) })); setPage(1); }} type="number" min={0} className="input-field py-2.5" placeholder="Max price" />
                <select value={filters.condition} onChange={(event) => { setFilters((prev) => ({ ...prev, condition: event.target.value })); setPage(1); }} className="input-field py-2.5">
                  {conditionOptions.map((option) => (
                    <option key={option.value || 'default'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select value={filters.sort} onChange={(event) => { setFilters((prev) => ({ ...prev, sort: event.target.value as SortOption })); setPage(1); }} className="input-field py-2.5">
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-600">
                  {locationSource === 'live'
                    ? `Using live location (${center[0].toFixed(5)}, ${center[1].toFixed(5)})`
                    : locationSource === 'district'
                    ? `Using district center (${center[0].toFixed(5)}, ${center[1].toFixed(5)})`
                    : 'Pick a district or use your live location for better local browsing.'}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={onResetFilters}>
                    Reset
                  </Button>
                  <Link to="/" className="btn-secondary !px-4 !py-2 text-sm">
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-card backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">{pagination.total.toLocaleString()} products</p>
                <p className="text-sm text-slate-500">Showing {results.length} matching listings</p>
              </div>
              <Badge variant="info">Page {pagination.page} of {pagination.totalPages}</Badge>
            </div>

            {loading && <p className="py-8 text-sm text-slate-500">Loading products...</p>}
            {error && !loading && <p className="py-8 text-sm text-rose-600">{error}</p>}
            {!loading && !error && results.length === 0 && (
              <p className="py-8 text-sm text-slate-500">No products found. Try another search or open the browse filters.</p>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {results.map((item) => (
                <Link
                  key={item._id}
                  to={`/listings/${item._id}`}
                  onMouseEnter={() => setSelectedItemId(item._id)}
                  className={`group overflow-hidden rounded-[22px] border bg-white transition-all duration-300 ${
                    selectedItemId === item._id
                      ? 'border-indigo-300 shadow-lg shadow-indigo-100'
                      : 'border-slate-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/80'
                  }`}
                >
                  <img src={getListingImage(item)} alt={item.title} className="h-48 w-full object-cover" />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-slate-900">{item.title}</h2>
                        <p className="mt-1 text-xs text-slate-500">{formatCondition(item.condition)}</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(item.price, item.currency)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <FiMapPin size={12} /> {item.location?.city || 'City not available'}
                      </span>
                      <span className="font-medium text-indigo-700">Open details</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {!loading && !error && results.length > 0 && (
              <div className="mt-5 flex items-center justify-center">
                <Button type="button" variant="secondary" onClick={onLoadMore} isLoading={loadingMore} disabled={page >= pagination.totalPages}>
                  {page < pagination.totalPages ? 'Load More Products' : 'No More Products'}
                </Button>
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-card backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">Map Preview</p>
                  <p className="text-xs text-slate-500">A smaller live map for local context</p>
                </div>
                <button type="button" onClick={() => setIsMapOpen((prev) => !prev)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">
                  {isMapOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                  {isMapOpen ? 'Hide' : 'Show'}
                </button>
              </div>

              {isMapOpen ? (
                <GeoMapCanvas
                  center={center}
                  radiusKm={5}
                  items={mapItems}
                  selectedItemId={selectedItemId}
                  onCenterChange={setCenter}
                  onSelectItem={(item) => setSelectedItemId(item.id)}
                  heightClassName="h-[280px]"
                />
              ) : (
                <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Map preview is hidden. Turn it back on when you want to explore nearby areas.
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default BrowseListingsPage;
