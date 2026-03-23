import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiChevronDown,
  FiChevronUp,
  FiCrosshair,
  FiMapPin,
  FiNavigation,
  FiSearch,
  FiSliders,
} from 'react-icons/fi';
import GeoMapCanvas from '@/components/map/GeoMapCanvas';
import { geoApi } from '@/api/geo';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useCategoryStore } from '@/store/categoryStore';
import { GeoNearbyItem } from '@/types';

type SortOption = 'nearest' | 'priceAsc' | 'priceDesc';

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

const sortOptions: { label: string; value: SortOption }[] = [
  { label: 'Nearest', value: 'nearest' },
  { label: 'Price: Low to High', value: 'priceAsc' },
  { label: 'Price: High to Low', value: 'priceDesc' },
];

const parseNumber = (value: string | null) => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const sortServices = (services: GeoNearbyItem[], sort: SortOption) => {
  const cloned = [...services];

  if (sort === 'priceAsc') {
    return cloned.sort((a, b) => a.price - b.price);
  }

  if (sort === 'priceDesc') {
    return cloned.sort((a, b) => b.price - a.price);
  }

  return cloned.sort((a, b) => a.distance - b.distance);
};

const BrowseServicesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [center, setCenter] = React.useState<[number, number]>([6.9271, 79.8612]);
  const [isMapOpen, setIsMapOpen] = React.useState(true);
  const [searchInput, setSearchInput] = React.useState(searchParams.get('searchTerm') || '');
  const [filters, setFilters] = React.useState({
    searchTerm: searchParams.get('searchTerm') || '',
    categoryId: searchParams.get('categoryId') || '',
    city: searchParams.get('city') || '',
    minPrice: parseNumber(searchParams.get('minPrice')),
    maxPrice: parseNumber(searchParams.get('maxPrice')),
    sort: (searchParams.get('sort') as SortOption) || 'nearest',
    radiusKm: parseNumber(searchParams.get('radiusKm')) || 5,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<GeoNearbyItem[]>([]);
  const [selectedItemId, setSelectedItemId] = React.useState<string | undefined>();
  const [locationSource, setLocationSource] = React.useState<'district' | 'live' | ''>('');
  const [locationName, setLocationName] = React.useState('Colombo');

  const { serviceCategories, fetchCategories } = useCategoryStore();

  React.useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, searchTerm: searchInput.trim() }));
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (filters.searchTerm) params.set('searchTerm', filters.searchTerm);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.city) params.set('city', filters.city);
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    if (filters.sort !== 'nearest') params.set('sort', filters.sort);
    if (filters.radiusKm !== 5) params.set('radiusKm', String(filters.radiusKm));
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await geoApi.searchWithFilters({
          latitude: center[0],
          longitude: center[1],
          radiusKm: filters.radiusKm,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          type: 'SERVICE',
          categoryId: filters.categoryId || undefined,
        });

        const geoValidServices = data.data.services.filter(
          (service) =>
            service.location?.coordinates &&
            Number.isFinite(service.location.coordinates[0]) &&
            Number.isFinite(service.location.coordinates[1])
        );

        const cityFiltered = filters.city
          ? geoValidServices.filter((service) => service.city.toLowerCase() === filters.city.toLowerCase())
          : geoValidServices;

        const searchFiltered = filters.searchTerm
          ? cityFiltered.filter((service) => {
              const query = filters.searchTerm.toLowerCase();
              return (
                service.title.toLowerCase().includes(query) ||
                service.description?.toLowerCase().includes(query) ||
                service.city.toLowerCase().includes(query)
              );
            })
          : cityFiltered;

        setResults(sortServices(searchFiltered, filters.sort));
      } catch {
        setError('Unable to load nearby services. Try another area or radius.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [center, filters]);

  React.useEffect(() => {
    if (results.length === 0) {
      setSelectedItemId(undefined);
      return;
    }

    if (!selectedItemId) {
      setSelectedItemId(results[0].id);
    }
  }, [results, selectedItemId]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter([position.coords.latitude, position.coords.longitude]);
        setLocationSource('live');
        setLocationName('Current Location');
        setIsMapOpen(true);
        toast.success('Location updated.');
      },
      () => {
        toast.error('Location permission denied. You can click map to set location.');
      }
    );
  };

  const onDistrictChange = (districtName: string) => {
    const district = SRI_LANKAN_DISTRICTS.find((item) => item.name === districtName);

    setFilters((prev) => ({ ...prev, city: districtName }));
    setLocationName(districtName || 'Selected Location');

    if (district) {
      setCenter([district.lat, district.lng]);
      setLocationSource('district');
      setIsMapOpen(true);
    }
  };

  const onResetFilters = () => {
    setSearchInput('');
    setFilters({
      searchTerm: '',
      categoryId: '',
      city: '',
      minPrice: undefined,
      maxPrice: undefined,
      sort: 'nearest',
      radiusKm: 5,
    });
    setLocationSource('');
    setLocationName('Colombo');
    setCenter([6.9271, 79.8612]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 py-10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-1 lg:sticky lg:top-24 lg:h-fit">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Nearby Services</h1>
            <p className="mt-1 text-sm text-slate-500">Search, filter, and explore nearby providers using map-first discovery.</p>
          </div>

          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              type="search"
              className="input-field py-2 pl-9"
              placeholder="Search services by title, city, or description"
            />
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <FiCrosshair size={16} /> Use My Location
          </button>

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
              onChange={(event) => setFilters((prev) => ({ ...prev, categoryId: event.target.value }))}
              className="input-field py-2"
            >
              <option value="">All Service Categories</option>
              {serviceCategories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Distance Radius</span>
              <span>{filters.radiusKm} km</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={filters.radiusKm}
              onChange={(e) => setFilters((prev) => ({ ...prev, radiusKm: Number(e.target.value) }))}
              className="w-full"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 3, 5, 10].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, radiusKm: value }))}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    filters.radiusKm === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {value}km
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              value={filters.minPrice ?? ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: parseNumber(e.target.value) }))}
              type="number"
              min={0}
              placeholder="Min price"
              className="input-field py-2"
            />
            <input
              value={filters.maxPrice ?? ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: parseNumber(e.target.value) }))}
              type="number"
              min={0}
              placeholder="Max price"
              className="input-field py-2"
            />
          </div>

          <select
            value={filters.sort}
            onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value as SortOption }))}
            className="input-field py-2"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

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

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-600">
              {locationSource === 'live'
                ? `Using live location: ${locationName}`
                : locationSource === 'district'
                ? `Using district: ${locationName}`
                : `Selected location: ${locationName}`}
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
              radiusKm={filters.radiusKm}
              items={results}
              selectedItemId={selectedItemId}
              onCenterChange={setCenter}
              onSelectItem={(item) => setSelectedItemId(item.id)}
            />
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">{results.length} services found</p>
              <Badge variant="info">Radius {filters.radiusKm}km</Badge>
            </div>

            {loading && <p className="py-6 text-sm text-slate-500">Loading nearby services...</p>}
            {error && !loading && <p className="py-6 text-sm text-rose-600">{error}</p>}

            {!loading && !error && results.length === 0 && (
              <p className="py-6 text-sm text-slate-500">No services found in this area. Increase radius or change location.</p>
            )}

            <div className="space-y-3">
              {results.map((item) => (
                <Link
                  key={item.id}
                  to={`/services/${item.id}`}
                  onMouseEnter={() => setSelectedItemId(item.id)}
                  className={`block rounded-xl border p-3 transition-colors ${
                    selectedItemId === item.id ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.pricingType || 'Pricing not specified'}</p>
                      <div className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600">
                        <FiMapPin size={12} /> {item.city}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">LKR {item.price.toLocaleString()}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                        <FiNavigation size={12} /> {item.distance} km
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseServicesPage;
