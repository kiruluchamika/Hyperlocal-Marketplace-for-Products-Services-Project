import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiArrowRight,
  FiChevronDown,
  FiChevronUp,
  FiCrosshair,
  FiImage,
  FiMapPin,
  FiSliders,
} from 'react-icons/fi';
import GeoMapCanvas from '@/components/map/GeoMapCanvas';
import { listingsApi } from '@/api/listings';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useCategoryStore } from '@/store/categoryStore';
import { GeoNearbyItem, IProductListing } from '@/types';
import { formatCondition, formatCurrency } from '@/utils/listings';

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
  const navbarSearch = searchParams.get('search') || searchParams.get('searchTerm') || '';
  const [center, setCenter] = React.useState<[number, number]>([6.9271, 79.8612]);
  const [isMapOpen, setIsMapOpen] = React.useState(true);
  const [isBrowseOpen, setIsBrowseOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({
    searchTerm: navbarSearch,
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
    setFilters((prev) => (prev.searchTerm === navbarSearch ? prev : { ...prev, searchTerm: navbarSearch }));
    setPage(1);
  }, [navbarSearch]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (filters.searchTerm) params.set('search', filters.searchTerm);
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
    <div className="min-h-screen bg-transparent py-4 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1536px] px-6 sm:px-10 lg:px-14 xl:px-20 2xl:px-24">
        <section className={`grid grid-cols-1 items-start gap-6 xl:gap-8 ${isMapOpen ? 'lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]' : 'lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]'}`}>
          <div className="order-1 flex flex-col pt-2 md:pt-4">
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-200/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <p className="text-2xl font-bold tracking-tight text-slate-900">{pagination.total.toLocaleString()} products</p>
                <p className="text-sm text-slate-500">Showing {results.length} listing{results.length === 1 ? '' : 's'} that match your current browse settings</p>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <Badge variant="info" className="!px-3 !py-1 text-xs font-medium">Page {pagination.page} of {pagination.totalPages}</Badge>
                <p className="text-sm font-medium text-slate-500">{filters.searchTerm || filters.city || filters.categoryId ? 'Filtered results' : 'All active products'}</p>
              </div>
            </div>

            <div className="lg:min-h-0 lg:flex-1">
              {loading && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <ListingCardSkeleton key={index} />
                  ))}
                </div>
              )}
              {error && !loading && <p className="py-8 text-sm text-rose-600">{error}</p>}
              {!loading && !error && results.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
                  <h3 className="text-lg font-semibold text-slate-900">No products match this search</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Try adjusting your search term, price range, district, or category to discover more nearby listings.
                  </p>
                  <div className="mt-5 flex justify-center">
                    <Button type="button" variant="secondary" size="sm" onClick={onResetFilters}>
                      Reset filters
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((item) => (
                  <ListingCard
                    key={item._id}
                    item={item}
                    isSelected={selectedItemId === item._id}
                    onMouseEnter={() => setSelectedItemId(item._id)}
                  />
                ))}
              </div>

              {!loading && !error && results.length > 0 && (
                <div className="mt-8 flex flex-col items-center gap-3">
                  <Button type="button" variant="secondary" onClick={onLoadMore} isLoading={loadingMore} disabled={page >= pagination.totalPages}>
                    Load More Products
                  </Button>
                  {page >= pagination.totalPages && (
                    <p className="text-sm text-slate-500">You have reached the end of the current product results.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="order-2 space-y-4 lg:self-start relative z-10 w-full">
            <div className="space-y-5 lg:sticky lg:top-24">
              <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-card backdrop-blur-xl">
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" size="sm" leftIcon={<FiSliders size={14} />} onClick={() => setIsBrowseOpen((prev) => !prev)}>
                    {isBrowseOpen ? 'Hide Browse' : 'Browse'}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" leftIcon={<FiCrosshair size={14} />} onClick={useCurrentLocation}>
                    Use My Location
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsMapOpen((prev) => !prev)}>
                    {isMapOpen ? 'Hide Map' : 'Show Map'}
                  </Button>
                </div>

                {isBrowseOpen && (
                  <div className="mt-4 border-t border-indigo-100 pt-4">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">Browse Filters</h2>
                      <p className="mt-1 text-sm text-slate-500">Refine by category, price, condition, and location.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
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
                      <div className="grid grid-cols-2 gap-3">
                        <input value={filters.minPrice ?? ''} onChange={(event) => { setFilters((prev) => ({ ...prev, minPrice: parseNumber(event.target.value) })); setPage(1); }} type="number" min={0} className="input-field py-2.5" placeholder="Min price" />
                        <input value={filters.maxPrice ?? ''} onChange={(event) => { setFilters((prev) => ({ ...prev, maxPrice: parseNumber(event.target.value) })); setPage(1); }} type="number" min={0} className="input-field py-2.5" placeholder="Max price" />
                      </div>
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

                    <div className="mt-4 flex flex-col gap-3">
                      <p className="text-sm text-slate-600">
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
                        <Link to="/" className="btn-secondary !px-4 !py-3 text-sm">
                          Back to Home
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[26px] border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
                <div className="mb-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">Map Preview</p>
                    <p className="text-sm text-slate-500">A lighter support view for nearby listing context</p>
                  </div>
                </div>

                {isMapOpen ? (
                  <GeoMapCanvas
                    center={center}
                    radiusKm={5}
                    items={mapItems}
                    selectedItemId={selectedItemId}
                    onCenterChange={setCenter}
                    onSelectItem={(item) => setSelectedItemId(item.id)}
                    heightClassName="h-[260px] sm:h-[300px] lg:h-[280px]"
                  />
                ) : (
                  <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
                    Map preview is hidden. Turn it back on when you want to explore nearby areas.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

const ListingCard: React.FC<{
  item: IProductListing;
  isSelected: boolean;
  onMouseEnter: () => void;
}> = ({ item, isSelected, onMouseEnter }) => {
  const hasImage = Array.isArray(item.images) && item.images.length > 0 && !!item.images[0];

  return (
    <Link
      to={`/listings/${item._id}`}
      onMouseEnter={onMouseEnter}
      className={`group flex h-full flex-col overflow-hidden rounded-[24px] border bg-white transition-all duration-300 ${
        isSelected
          ? 'border-indigo-400 shadow-xl shadow-indigo-100/80 ring-4 ring-indigo-50/50'
          : 'border-slate-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-slate-200/60'
      }`}
    >
      <div className="h-52 w-full overflow-hidden bg-slate-100">
        {hasImage ? (
          <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-violet-50 text-slate-500">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 shadow-sm">
              <FiImage size={24} />
            </div>
            <p className="mt-3 text-sm font-medium">Image not available</p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="line-clamp-2 min-h-[3rem] text-base font-semibold leading-6 text-slate-900 transition-colors group-hover:text-indigo-700">{item.title}</h2>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{formatCurrency(item.price, item.currency)}</p>
        
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {formatCondition(item.condition)}
          </span>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
          <FiMapPin size={14} className="text-slate-400" />
          <span className="truncate">{item.location?.city || 'City not available'}</span>
        </p>

        <div className="mt-auto pt-5">
          <span className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-800">
            View listing
            <FiArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
};

const ListingCardSkeleton: React.FC = () => (
  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
    <div className="h-52 animate-pulse bg-slate-100" />
    <div className="space-y-3 p-5">
      <div className="h-6 w-4/5 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-6 w-2/5 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-4 w-1/3 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-4 w-1/2 animate-pulse rounded-lg bg-slate-100" />
      <div className="pt-3">
        <div className="h-12 w-36 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  </div>
);

export default BrowseListingsPage;
