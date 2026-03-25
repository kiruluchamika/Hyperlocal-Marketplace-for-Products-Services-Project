import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiArrowRight,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiCrosshair,
  FiImage,
  FiMapPin,
  FiSliders,
} from 'react-icons/fi';
import GeoMapCanvas from '@/components/map/GeoMapCanvas';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { servicesApi } from '@/api/services';
import { useCategoryStore } from '@/store/categoryStore';
import { GeoNearbyItem, IServiceSelling } from '@/types';

type SortOption = 'recent' | 'priceAsc' | 'priceDesc';
type ServicePricingFilter = '' | 'FIXED' | 'HOURLY';

interface BrowseServiceFilters {
  search: string;
  categoryId: string;
  city: string;
  pricingType: ServicePricingFilter;
  minPrice?: number;
  maxPrice?: number;
  sort: SortOption;
}

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

const sortServices = (services: IServiceSelling[], sort: SortOption) => {
  const cloned = [...services];
  if (sort === 'priceAsc') return cloned.sort((a, b) => a.price - b.price);
  if (sort === 'priceDesc') return cloned.sort((a, b) => b.price - a.price);
  return cloned.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const getServiceCity = (service: IServiceSelling) => service.location?.city || service.locationText || 'Location unavailable';
const getServiceCategory = (service: IServiceSelling) => typeof service.categoryId === 'string' ? 'Service' : service.categoryId?.name || 'Service';

const matchesDistrict = (service: IServiceSelling, districtName: string) => {
  if (!districtName) return true;
  const normalizedDistrict = districtName.toLowerCase();
  const normalizedLocation = `${service.location?.city || ''} ${service.locationText}`.toLowerCase();
  return normalizedLocation.includes(normalizedDistrict);
};

const toGeoItem = (service: IServiceSelling): GeoNearbyItem | null => {
  const coords = service.location?.coordinates?.coordinates;
  if (!coords || coords.length !== 2) return null;

  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: service._id,
    type: 'SERVICE',
    title: service.title,
    description: service.description,
    price: service.price,
    pricingType: service.pricingType,
    city: getServiceCity(service),
    distance: 0,
    sellerId: typeof service.sellerId === 'string' ? service.sellerId : service.sellerId.id,
    categoryId: typeof service.categoryId === 'string' ? service.categoryId : service.categoryId._id,
    location: { coordinates: [lat, lng], text: service.locationText },
    images: service.images,
    status: service.status,
    isActive: service.isActive,
  };
};

const BrowseServicesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navbarSearch = searchParams.get('search') || '';
  const [center, setCenter] = React.useState<[number, number]>([6.9271, 79.8612]);
  const [isMapOpen, setIsMapOpen] = React.useState(true);
  const [isBrowseOpen, setIsBrowseOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<BrowseServiceFilters>({
    search: navbarSearch,
    categoryId: searchParams.get('categoryId') || '',
    city: searchParams.get('city') || '',
    pricingType: (searchParams.get('pricingType') as ServicePricingFilter) || '',
    minPrice: parseNumber(searchParams.get('minPrice')),
    maxPrice: parseNumber(searchParams.get('maxPrice')),
    sort: (searchParams.get('sort') as SortOption) || 'recent',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<IServiceSelling[]>([]);
  const [selectedItemId, setSelectedItemId] = React.useState<string | undefined>();
  const [locationSource, setLocationSource] = React.useState<'district' | 'live' | ''>('');

  const { serviceCategories, fetchCategories } = useCategoryStore();

  React.useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  React.useEffect(() => {
    setFilters((prev) => (prev.search === navbarSearch ? prev : { ...prev, search: navbarSearch }));
  }, [navbarSearch]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.city) params.set('city', filters.city);
    if (filters.pricingType) params.set('pricingType', filters.pricingType);
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    if (filters.sort !== 'recent') params.set('sort', filters.sort);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  React.useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await servicesApi.getAll({
          search: filters.search || undefined,
          categoryId: filters.categoryId || undefined,
          pricingType: filters.pricingType || undefined,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          limit: 50,
        });

        const filtered = (data.data || []).filter(
          (service) => service.status === 'ACTIVE' && service.isActive !== false && matchesDistrict(service, filters.city)
        );
        setResults(sortServices(filtered, filters.sort));
      } catch {
        setError('Unable to load active services right now. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void fetchServices();
  }, [filters]);

  const mapItems = React.useMemo(() => results.map(toGeoItem).filter((item): item is GeoNearbyItem => !!item), [results]);

  React.useEffect(() => {
    if (filters.city) {
      const district = SRI_LANKAN_DISTRICTS.find((item) => item.name === filters.city);
      if (district) setCenter([district.lat, district.lng]);
      return;
    }

    if (mapItems.length > 0 && mapItems[0].location?.coordinates) {
      setCenter(mapItems[0].location.coordinates);
    }
  }, [filters.city, mapItems]);

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

    if (district) {
      setCenter([district.lat, district.lng]);
      setLocationSource('district');
      setIsMapOpen(true);
    }
  };

  const onResetFilters = () => {
    setFilters({
      search: '',
      categoryId: '',
      city: '',
      pricingType: '',
      minPrice: undefined,
      maxPrice: undefined,
      sort: 'recent',
    });
    setLocationSource('');
  };

  return (
    <div className="min-h-screen bg-transparent py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className={`grid grid-cols-1 items-start gap-6 xl:gap-8 ${isMapOpen ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'lg:grid-cols-[minmax(0,1fr)_320px]'}`}>
          <div className="order-1 rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-card backdrop-blur-xl sm:p-6 lg:flex lg:max-h-[calc(100vh-7.5rem)] lg:flex-col lg:self-start lg:overflow-hidden">
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <p className="text-xl font-semibold tracking-tight text-slate-900">{results.length.toLocaleString()} active services</p>
                <p className="text-sm text-slate-500">Browse active service ads and open a service to continue to booking</p>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <Badge variant="info" className="!px-3 !py-1 text-xs">{mapItems.length} geo-mapped</Badge>
                <p className="text-sm text-slate-500">{filters.search || filters.city || filters.categoryId ? 'Filtered results' : 'All active services'}</p>
              </div>
            </div>

            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
              {loading && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <ServiceCardSkeleton key={index} />
                  ))}
                </div>
              )}
              {error && !loading && <p className="py-8 text-sm text-rose-600">{error}</p>}
              {!loading && !error && results.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
                  <h3 className="text-lg font-semibold text-slate-900">No services match this search</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Try adjusting your search term, district, category, or pricing filters to discover more service ads.
                  </p>
                  <div className="mt-5 flex justify-center">
                    <Button type="button" variant="secondary" size="sm" onClick={onResetFilters}>
                      Reset filters
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {results.map((service) => (
                  <ServiceCard
                    key={service._id}
                    service={service}
                    isSelected={selectedItemId === service._id}
                    onMouseEnter={() => setSelectedItemId(service._id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className="order-2 space-y-4 lg:self-start">
            <div className="space-y-4 lg:sticky lg:top-24">
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
                      <p className="mt-1 text-sm text-slate-500">Refine by category, pricing, price range, and location.</p>
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
                      <select value={filters.categoryId} onChange={(event) => setFilters((prev) => ({ ...prev, categoryId: event.target.value }))} className="input-field py-2.5">
                        <option value="">All Categories</option>
                        {serviceCategories.map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-3">
                        <input value={filters.minPrice ?? ''} onChange={(event) => setFilters((prev) => ({ ...prev, minPrice: parseNumber(event.target.value) }))} type="number" min={0} className="input-field py-2.5" placeholder="Min price" />
                        <input value={filters.maxPrice ?? ''} onChange={(event) => setFilters((prev) => ({ ...prev, maxPrice: parseNumber(event.target.value) }))} type="number" min={0} className="input-field py-2.5" placeholder="Max price" />
                      </div>
                      <select value={filters.pricingType} onChange={(event) => setFilters((prev) => ({ ...prev, pricingType: event.target.value as ServicePricingFilter }))} className="input-field py-2.5">
                        <option value="">All Pricing Types</option>
                        <option value="FIXED">Fixed Pricing</option>
                        <option value="HOURLY">Hourly Pricing</option>
                      </select>
                      <select value={filters.sort} onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value as SortOption }))} className="input-field py-2.5">
                        <option value="recent">Most Recent</option>
                        <option value="priceAsc">Price: Low to High</option>
                        <option value="priceDesc">Price: High to Low</option>
                      </select>
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      <p className="text-sm text-slate-600">
                        {locationSource === 'live'
                          ? `Using live location (${center[0].toFixed(5)}, ${center[1].toFixed(5)})`
                          : locationSource === 'district'
                          ? `Using district center (${center[0].toFixed(5)}, ${center[1].toFixed(5)})`
                          : 'Pick a district or use your live location for more local service discovery.'}
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
                    <p className="text-sm text-slate-500">A lighter support view for nearby service context</p>
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
                    Map preview is hidden. Turn it on whenever you want a quick geo view.
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

const ServiceCard: React.FC<{
  service: IServiceSelling;
  isSelected: boolean;
  onMouseEnter: () => void;
}> = ({ service, isSelected, onMouseEnter }) => {
  const hasImage = Array.isArray(service.images) && service.images.length > 0 && !!service.images[0];
  const category = getServiceCategory(service);

  return (
    <Link
      to={`/services/${service._id}`}
      state={{ service }}
      onMouseEnter={onMouseEnter}
      className={`group flex h-full flex-col overflow-hidden rounded-[24px] border bg-white transition-all duration-300 ${
        isSelected
          ? 'border-indigo-300 shadow-lg shadow-indigo-100/80'
          : 'border-slate-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/90'
      }`}
    >
      <div className="h-52 w-full overflow-hidden bg-slate-100">
        {hasImage ? (
          <img src={service.images[0]} alt={service.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
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
        <h2 className="min-h-[3.5rem] text-lg font-semibold leading-7 text-slate-900">{service.title}</h2>
        <p className="mt-3 text-xl font-bold tracking-tight text-slate-900">LKR {service.price.toLocaleString()}</p>
        <p className="mt-3 text-sm text-slate-500">{category}</p>
        <div className="mt-2 flex flex-col gap-2 text-sm text-slate-500">
          <p className="inline-flex items-center gap-2">
            <FiClock size={15} className="text-slate-400" />
            {service.pricingType === 'HOURLY' ? 'Hourly pricing' : 'Fixed pricing'}
          </p>
          <p className="inline-flex items-center gap-2">
            <FiMapPin size={15} className="text-slate-400" />
            {getServiceCity(service)}
          </p>
        </div>

        <div className="mt-auto pt-5">
          <span className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-indigo-200 px-4 py-3 text-sm font-semibold text-indigo-700 transition-colors group-hover:border-indigo-300 group-hover:bg-indigo-50/70">
            Open booking
            <FiArrowRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
};

const ServiceCardSkeleton: React.FC = () => (
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

export default BrowseServicesPage;
