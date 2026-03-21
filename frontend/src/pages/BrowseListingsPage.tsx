import React from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCrosshair, FiMapPin, FiNavigation } from 'react-icons/fi';
import GeoMapCanvas from '@/components/map/GeoMapCanvas';
import { geoApi } from '@/api/geo';
import { useCategoryStore } from '@/store/categoryStore';
import { GeoNearbyItem } from '@/types';

const BrowseListingsPage: React.FC = () => {
  const [center, setCenter] = React.useState<[number, number]>([6.9271, 79.8612]);
  const [radiusKm, setRadiusKm] = React.useState(5);
  const [minPrice, setMinPrice] = React.useState('');
  const [maxPrice, setMaxPrice] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<GeoNearbyItem[]>([]);
  const [selectedItemId, setSelectedItemId] = React.useState<string | undefined>();

  const { productCategories, fetchCategories } = useCategoryStore();

  React.useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await geoApi.searchWithFilters({
          latitude: center[0],
          longitude: center[1],
          radiusKm,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          type: 'PRODUCT',
          categoryId: categoryId || undefined,
        });

        setResults(data.data.products);
      } catch {
        setError('Unable to load nearby products. Try a different area or radius.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [center, radiusKm, minPrice, maxPrice, categoryId]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter([position.coords.latitude, position.coords.longitude]);
        toast.success('Location updated.');
      },
      () => {
        toast.error('Location permission denied. You can click the map to set location.');
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 py-10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-1 lg:sticky lg:top-24 lg:h-fit">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Nearby Products</h1>
            <p className="mt-1 text-sm text-slate-500">Pick a center point, choose distance, and discover products around that area.</p>
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <FiCrosshair size={16} /> Use My Location
          </button>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Latitude</label>
              <input
                value={center[0]}
                onChange={(e) => setCenter([Number(e.target.value), center[1]])}
                type="number"
                className="input-field py-2"
                step="0.0001"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Longitude</label>
              <input
                value={center[1]}
                onChange={(e) => setCenter([center[0], Number(e.target.value)])}
                type="number"
                className="input-field py-2"
                step="0.0001"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Distance Radius</span>
              <span>{radiusKm} km</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 3, 5, 10].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRadiusKm(value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    radiusKm === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {value}km
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              type="number"
              min={0}
              placeholder="Min price"
              className="input-field py-2"
            />
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              type="number"
              min={0}
              placeholder="Max price"
              className="input-field py-2"
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input-field py-2"
          >
            <option value="">All Product Categories</option>
            {productCategories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>

          <Link to="/" className="btn-secondary inline-block w-full text-center">
            &larr; Back to Home
          </Link>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <GeoMapCanvas
            center={center}
            radiusKm={radiusKm}
            items={results}
            selectedItemId={selectedItemId}
            onCenterChange={setCenter}
            onSelectItem={(item) => setSelectedItemId(item.id)}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">{results.length} products found</p>
              <p className="text-xs text-slate-500">Tip: click on map to change center</p>
            </div>

            {loading && <p className="py-6 text-sm text-slate-500">Loading nearby products...</p>}
            {error && !loading && <p className="py-6 text-sm text-rose-600">{error}</p>}

            {!loading && !error && results.length === 0 && (
              <p className="py-6 text-sm text-slate-500">No products found in this area. Increase radius or choose another location.</p>
            )}

            <div className="space-y-3">
              {results.map((item) => (
                <Link
                  key={item.id}
                  to={`/listings/${item.id}`}
                  onMouseEnter={() => setSelectedItemId(item.id)}
                  className={`block rounded-xl border p-3 transition-colors ${
                    selectedItemId === item.id ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.condition || 'Condition not specified'}</p>
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

export default BrowseListingsPage;
