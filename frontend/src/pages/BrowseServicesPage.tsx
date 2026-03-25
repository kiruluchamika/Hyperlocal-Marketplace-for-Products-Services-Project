import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiCrosshair,
  FiMapPin,
  FiSearch,
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
const getServiceImage = (service: IServiceSelling) => service.images[0] || '';

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
  const [center, setCenter] = React.useState<[number, number]>([6.9271, 79.8612]);
  const [isMapOpen, setIsMapOpen] = React.useState(true);
  const [isBrowseOpen, setIsBrowseOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState(searchParams.get('search') || '');
  const [filters, setFilters] = React.useState<BrowseServiceFilters>({
    search: searchParams.get('search') || '',
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
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput.trim() }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
    setSearchInput('');
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
                placeholder="Search services by title or description"
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
                <select value={filters.categoryId} onChange={(event) => setFilters((prev) => ({ ...prev, categoryId: event.target.value }))} className="input-field py-2.5">
                  <option value="">All Categories</option>
                  {serviceCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input value={filters.minPrice ?? ''} onChange={(event) => setFilters((prev) => ({ ...prev, minPrice: parseNumber(event.target.value) }))} type="number" min={0} className="input-field py-2.5" placeholder="Min price" />
                <input value={filters.maxPrice ?? ''} onChange={(event) => setFilters((prev) => ({ ...prev, maxPrice: parseNumber(event.target.value) }))} type="number" min={0} className="input-field py-2.5" placeholder="Max price" />
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

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-600">
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
                <p className="text-lg font-semibold text-slate-900">{results.length.toLocaleString()} active services</p>
                <p className="text-sm text-slate-500">Tap a card to open the booking page</p>
              </div>
              <Badge variant="info">{mapItems.length} geo-mapped</Badge>
            </div>

            {loading && <p className="py-8 text-sm text-slate-500">Loading active services...</p>}
            {error && !loading && <p className="py-8 text-sm text-rose-600">{error}</p>}
            {!loading && !error && results.length === 0 && (
              <p className="py-8 text-sm text-slate-500">No active services found. Try another search or open the browse filters.</p>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {results.map((service) => {
                const image = getServiceImage(service);
                const category = getServiceCategory(service);

                return (
                  <Link
                    key={service._id}
                    to={`/services/${service._id}`}
                    state={{ service }}
                    onMouseEnter={() => setSelectedItemId(service._id)}
                    className={`group overflow-hidden rounded-[22px] border bg-white transition-all duration-300 ${
                      selectedItemId === service._id
                        ? 'border-indigo-300 shadow-lg shadow-indigo-100'
                        : 'border-slate-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/80'
                    }`}
                  >
                    {image ? (
                      <img src={image} alt={service.title} className="h-48 w-full object-cover" />
                    ) : (
                      <div className="flex h-48 items-end bg-gradient-to-br from-violet-700 via-indigo-600 to-slate-900 p-4">
                        <p className="text-lg font-semibold text-white">{category}</p>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-semibold text-slate-900">{service.title}</h2>
                          <p className="mt-1 text-xs text-slate-500">{category}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-900">LKR {service.price.toLocaleString()}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <FiMapPin size={12} /> {getServiceCity(service)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FiClock size={12} /> {service.pricingType === 'HOURLY' ? 'Hourly' : 'Fixed'}
                        </span>
                      </div>

                      <div className="mt-3 text-xs font-medium text-indigo-700">Open booking</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-card backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">Map Preview</p>
                  <p className="text-xs text-slate-500">Smaller by default so services stay in focus</p>
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
                  Map preview is hidden. Turn it on whenever you want a quick geo view.
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default BrowseServicesPage;
