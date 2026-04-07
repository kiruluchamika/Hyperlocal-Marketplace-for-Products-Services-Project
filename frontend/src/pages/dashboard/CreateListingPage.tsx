import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCrosshair, FiSave, FiTrash2, FiUpload } from 'react-icons/fi';
import { listingsApi } from '@/api/listings';
import Button from '@/components/ui/Button';
import FullPageLoader from '@/components/ui/FullPageLoader';
import { useCategoryStore } from '@/store/categoryStore';
import { Condition, IProductListing, ListingStatus, TransactionMode } from '@/types';
import { formatCondition } from '@/utils/listings';

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE_MB = 5;

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

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

type ListingFormState = {
  title: string;
  description: string;
  categoryId: string;
  price: string;
  currency: string;
  condition: Condition;
  transactionMode: TransactionMode;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  images: string[];
  tags: string;
  status: ListingStatus;
  attributes: Record<string, any>;
};

const defaultForm: ListingFormState = {
  title: '',
  description: '',
  categoryId: '',
  price: '',
  currency: 'LKR',
  condition: 'USED_GOOD',
  transactionMode: 'BUY_NOW',
  city: '',
  address: '',
  latitude: '',
  longitude: '',
  images: [],
  tags: '',
  status: 'ACTIVE',
  attributes: {},
};

const toFormValues = (listing: IProductListing): ListingFormState => {
  const [lng, lat] = listing.location?.coordinates?.coordinates || [];

  return {
    title: listing.title || '',
    description: listing.description || '',
    categoryId: typeof listing.categoryId === 'string' ? listing.categoryId : listing.categoryId?._id || '',
    price: String(listing.price || ''),
    currency: listing.currency || 'LKR',
    condition: listing.condition,
    transactionMode: listing.transactionMode,
    city: listing.location?.city || '',
    address: listing.location?.address || '',
    latitude: lat !== undefined ? String(lat) : '',
    longitude: lng !== undefined ? String(lng) : '',
    images: listing.images || [],
    tags: listing.tags?.join(', ') || '',
    status: listing.status,
    attributes: listing.attributes || {},
  };
};

const validateForm = (form: ListingFormState, selectedCategory?: any) => {
  if (form.title.trim().length < 3) return 'Title must have at least 3 characters.';
  if (form.description.trim().length < 10) return 'Description must have at least 10 characters.';
  if (!form.categoryId) return 'Please select a category.';

  const price = Number(form.price);
  if (!Number.isFinite(price) || price <= 0) return 'Price must be a positive number.';

  if (!form.city.trim()) return 'City is required.';

  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Latitude and longitude are required.';

  if (form.images.length === 0) return 'Please add at least one product photo.';
  if (form.images.length > MAX_IMAGES) return `Maximum ${MAX_IMAGES} images are allowed.`;

  if (selectedCategory?.attributes) {
    for (const attr of selectedCategory.attributes) {
      if (attr.required) {
        const val = form.attributes[attr.fieldName];
        if (val === undefined || val === null || val === '') {
          return `Please provide a value for ${attr.fieldName}.`;
        }
      }
    }
  }

  return null;
};

const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit') || '';

  const { productCategories, fetchCategories } = useCategoryStore();

  const [form, setForm] = React.useState<ListingFormState>(defaultForm);
  const [loading, setLoading] = React.useState(false);
  const [loadingInitial, setLoadingInitial] = React.useState(!!editId);
  const [capturedLocationSource, setCapturedLocationSource] = React.useState<'district' | 'live' | ''>('');

  const selectedCategory = React.useMemo(() => productCategories.find(c => c._id === form.categoryId), [productCategories, form.categoryId]);

  React.useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  React.useEffect(() => {
    const fetchForEdit = async () => {
      if (!editId) {
        return;
      }

      try {
        const { data } = await listingsApi.getById(editId);
        setForm(toFormValues(data.data));
      } catch {
        toast.error('Unable to load listing for edit.');
      } finally {
        setLoadingInitial(false);
      }
    };

    void fetchForEdit();
  }, [editId]);

  const handleSelectImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const remainingSlots = MAX_IMAGES - form.images.length;
    if (remainingSlots <= 0) {
      toast.error(`You can upload up to ${MAX_IMAGES} images only.`);
      event.target.value = '';
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);

    const oversizedFile = selectedFiles.find((file) => file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);
    if (oversizedFile) {
      toast.error(`Each image must be less than ${MAX_IMAGE_SIZE_MB}MB.`);
      event.target.value = '';
      return;
    }

    try {
      const encodedImages = await Promise.all(selectedFiles.map((file) => fileToDataUrl(file)));
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...encodedImages],
      }));

      if (files.length > selectedFiles.length) {
        toast('Only the first selected images were added due to the max 10 limit.');
      }
    } catch {
      toast.error('Unable to process selected images. Please try again.');
    } finally {
      event.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const handleDistrictChange = (districtName: string) => {
    const district = SRI_LANKAN_DISTRICTS.find((item) => item.name === districtName);

    setForm((prev) => ({
      ...prev,
      city: districtName,
      latitude: district ? String(district.lat) : prev.latitude,
      longitude: district ? String(district.lng) : prev.longitude,
    }));

    if (district) {
      setCapturedLocationSource('district');
    }
  };

  const handleUseLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
        setCapturedLocationSource('live');
        toast.success('Live location captured successfully.');
      },
      () => {
        toast.error('Unable to capture live location. Please allow location permission.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateForm(form, selectedCategory);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const tags = form.tags
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId,
      price: Number(form.price),
      currency: form.currency || 'LKR',
      condition: form.condition,
      transactionMode: form.transactionMode,
      isNegotiable: form.transactionMode === 'NEGOTIABLE',
      images: form.images,
      location: {
        city: form.city.trim(),
        address: form.address.trim() || undefined,
        coordinates: {
          type: 'Point' as const,
          coordinates: [Number(form.longitude), Number(form.latitude)] as [number, number],
        },
      },
      tags,
      attributes: form.attributes, // Send tracked custom categorization fields
      ...(editId ? { status: form.status } : {}),
    };

    try {
      setLoading(true);

      if (editId) {
        await listingsApi.update(editId, payload);
        toast.success('Listing updated successfully.');
      } else {
        await listingsApi.create(payload);
        toast.success('Listing created successfully.');
      }

      navigate('/dashboard/listings');
    } catch {
      setLoading(false);
    }
  };

  if (loadingInitial) {
    return <FullPageLoader label="Loading listing data..." />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{editId ? 'Edit Listing' : 'Create New Listing'}</h1>
          <p className="mt-1 text-sm text-slate-500">Complete each section to publish a quality product listing.</p>
        </div>
        <Link to="/dashboard/listings" className="btn-secondary text-sm">
          Back to My Listings
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">Basic Information</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Title</label>
              <input
                className="input-field py-2"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                maxLength={120}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
              <textarea
                className="input-field py-2"
                rows={5}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                maxLength={3000}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
              <select
                className="input-field py-2"
                value={form.categoryId}
                onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                required
              >
                <option value="">Select a category</option>
                {productCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Condition</label>
              <select
                className="input-field py-2"
                value={form.condition}
                onChange={(event) => setForm((prev) => ({ ...prev, condition: event.target.value as Condition }))}
              >
                {(['NEW', 'USED_LIKE_NEW', 'USED_GOOD', 'USED_FAIR'] as Condition[]).map((condition) => (
                  <option key={condition} value={condition}>
                    {formatCondition(condition)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {selectedCategory && selectedCategory.attributes && selectedCategory.attributes.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-semibold text-slate-800">Category Attributes</h2>
            <p className="mt-1 text-xs text-slate-500 text-balance mb-4">These extra details help buyers discover your item faster.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {selectedCategory.attributes.map((attr) => (
                <div key={attr.fieldName} className={attr.fieldType === 'boolean' ? 'flex items-center mt-6' : ''}>
                  {attr.fieldType !== 'boolean' && (
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      {attr.fieldName} {attr.required && <span className="text-rose-500">*</span>}
                    </label>
                  )}
                  {attr.fieldType === 'string' && (
                    <input
                      className="input-field py-2"
                      value={form.attributes[attr.fieldName] || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, attributes: { ...prev.attributes, [attr.fieldName]: e.target.value } }))}
                      required={attr.required}
                      placeholder={`Enter ${attr.fieldName.toLowerCase()}`}
                    />
                  )}
                  {attr.fieldType === 'number' && (
                    <input
                      type="number"
                      className="input-field py-2"
                      value={form.attributes[attr.fieldName] || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, attributes: { ...prev.attributes, [attr.fieldName]: e.target.value ? Number(e.target.value) : '' } }))}
                      required={attr.required}
                    />
                  )}
                  {attr.fieldType === 'select' && (
                    <select
                      className="input-field py-2"
                      value={form.attributes[attr.fieldName] || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, attributes: { ...prev.attributes, [attr.fieldName]: e.target.value } }))}
                      required={attr.required}
                    >
                      <option value="">Select option</option>
                      {attr.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  {attr.fieldType === 'boolean' && (
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 select-none">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 transition-colors cursor-pointer"
                        checked={!!form.attributes[attr.fieldName]}
                        onChange={(e) => setForm(prev => ({ ...prev, attributes: { ...prev.attributes, [attr.fieldName]: e.target.checked } }))}
                      />
                      {attr.fieldName} {attr.required && <span className="text-rose-500">*</span>}
                    </label>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">Pricing & Availability</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Price</label>
              <input
                type="number"
                min={1}
                className="input-field py-2"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Currency</label>
              <input
                className="input-field py-2"
                value={form.currency}
                onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                maxLength={5}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Transaction Mode</label>
              <select
                className="input-field py-2"
                value={form.transactionMode}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, transactionMode: event.target.value as TransactionMode }))
                }
              >
                <option value="BUY_NOW">Buy Now</option>
                <option value="NEGOTIABLE">Negotiable</option>
              </select>
            </div>
            {editId && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
                <select
                  className="input-field py-2"
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ListingStatus }))}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SOLD">SOLD</option>
                  <option value="HIDDEN">HIDDEN</option>
                </select>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">Media & Location</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Product Photos (max 10)</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary-300 bg-primary-50/60 px-4 py-4 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50">
                <FiUpload size={16} /> Choose photos from device
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => void handleSelectImages(event)}
                />
              </label>
              <p className="mt-1 text-xs text-slate-500">Supported: image files up to {MAX_IMAGE_SIZE_MB}MB each.</p>

              {form.images.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {form.images.map((image, index) => (
                    <div key={`${index}-${image.slice(0, 30)}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <img src={image} alt={`Selected ${index + 1}`} className="h-24 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-1 top-1 rounded-md bg-white/95 p-1 text-red-600 shadow"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">District</label>
              <select
                className="input-field py-2"
                value={form.city}
                onChange={(event) => handleDistrictChange(event.target.value)}
                required
              >
                <option value="">Select district</option>
                {SRI_LANKAN_DISTRICTS.map((district) => (
                  <option key={district.name} value={district.name}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Address (optional)</label>
              <input
                className="input-field py-2"
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">Location coordinates</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<FiCrosshair size={14} />}
                    onClick={handleUseLiveLocation}
                  >
                    Use Live Location
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {form.latitude && form.longitude
                    ? `Latitude: ${Number(form.latitude).toFixed(6)}, Longitude: ${Number(form.longitude).toFixed(6)} (${capturedLocationSource === 'live' ? 'live location' : 'district center'})`
                    : 'Select a district or use live location to auto-fill coordinates.'}
                </p>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Tags (comma separated)</label>
              <input
                className="input-field py-2"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="phone, electronics, second hand"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isLoading={loading} leftIcon={<FiSave size={16} />}>
            {editId ? 'Update Listing' : 'Create Listing'}
          </Button>
          <Link to="/dashboard/listings" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default CreateListingPage;
