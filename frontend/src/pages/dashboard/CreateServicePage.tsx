import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCrosshair, FiLink, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import FullPageLoader from '@/components/ui/FullPageLoader';
import { servicesApi } from '@/api/services';
import { useCategoryStore } from '@/store/categoryStore';
import { CategoryAttribute, ICategory, PricingType } from '@/types';

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE_MB = 5;

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

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

type AttributeInputValue = string | number | boolean;

type ServiceFormState = {
  title: string;
  description: string;
  categoryId: string;
  price: string;
  pricingType: PricingType;
  locationText: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  imageUrlInput: string;
  images: string[];
  attributeValues: Record<string, AttributeInputValue>;
};

const defaultForm: ServiceFormState = {
  title: '',
  description: '',
  categoryId: '',
  price: '',
  pricingType: 'FIXED',
  locationText: '',
  district: '',
  address: '',
  latitude: '',
  longitude: '',
  imageUrlInput: '',
  images: [],
  attributeValues: {},
};

const normalizeAttributeValues = (
  category: ICategory | undefined,
  values: Record<string, AttributeInputValue>
) => {
  if (!category) return {};

  return category.attributes.reduce<Record<string, AttributeInputValue>>((result, attribute) => {
    const rawValue = values[attribute.fieldName];

    if (attribute.fieldType === 'boolean') {
      result[attribute.fieldName] = rawValue === true || rawValue === 'true';
      return result;
    }

    if (attribute.fieldType === 'number') {
      const numericValue = Number(rawValue);
      if (Number.isFinite(numericValue)) {
        result[attribute.fieldName] = numericValue;
      }
      return result;
    }

    if (typeof rawValue === 'string' && rawValue.trim()) {
      result[attribute.fieldName] = rawValue.trim();
    }

    return result;
  }, {});
};

const validateForm = (form: ServiceFormState, category: ICategory | undefined) => {
  if (form.title.trim().length < 3) return 'Title must have at least 3 characters.';
  if (form.description.trim().length < 10) return 'Description must have at least 10 characters.';
  if (!form.categoryId) return 'Please select a service category.';

  const price = Number(form.price);
  if (!Number.isFinite(price) || price < 0) return 'Price must be a valid number.';
  if (form.locationText.trim().length < 2) return 'Location text is required.';

  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  if ((form.latitude.trim() || form.longitude.trim()) && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
    return 'Latitude and longitude must both be valid numbers.';
  }

  if (form.images.length > MAX_IMAGES) {
    return `Maximum ${MAX_IMAGES} images are allowed.`;
  }

  if (category) {
    for (const attribute of category.attributes) {
      const value = form.attributeValues[attribute.fieldName];
      const isEmptyString = typeof value === 'string' && value.trim().length === 0;
      const isMissing = value === undefined || value === null || isEmptyString;

      if (attribute.required && isMissing) {
        return `${attribute.fieldName} is required.`;
      }
    }
  }

  return null;
};

const renderAttributeInput = (
  attribute: CategoryAttribute,
  value: AttributeInputValue | undefined,
  onChange: (value: AttributeInputValue) => void
) => {
  if (attribute.fieldType === 'select') {
    return (
      <select className="input-field py-2" value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select an option</option>
        {(attribute.options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (attribute.fieldType === 'number') {
    return (
      <input
        type="number"
        className="input-field py-2"
        value={value === undefined ? '' : String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (attribute.fieldType === 'boolean') {
    return (
      <select
        className="input-field py-2"
        value={value === true ? 'true' : value === false ? 'false' : ''}
        onChange={(event) => onChange(event.target.value === 'true')}
      >
        <option value="">Select</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  return (
    <input
      className="input-field py-2"
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      maxLength={200}
    />
  );
};

const toFormValues = (service: {
  title: string;
  description: string;
  categoryId: string | { _id?: string };
  price: number;
  pricingType: PricingType;
  locationText: string;
  location?: {
    city?: string;
    address?: string;
    coordinates?: { coordinates?: [number, number] };
  };
  images: string[];
  attributeValues?: Record<string, unknown>;
}): ServiceFormState => {
  const coordinates = service.location?.coordinates?.coordinates || [];
  const [lng, lat] = coordinates;

  return {
    title: service.title || '',
    description: service.description || '',
    categoryId: typeof service.categoryId === 'string' ? service.categoryId : service.categoryId?._id || '',
    price: String(service.price ?? ''),
    pricingType: service.pricingType || 'FIXED',
    locationText: service.locationText || '',
    district: service.location?.city || '',
    address: service.location?.address || '',
    latitude: lat !== undefined ? String(lat) : '',
    longitude: lng !== undefined ? String(lng) : '',
    imageUrlInput: '',
    images: service.images || [],
    attributeValues: Object.entries(service.attributeValues || {}).reduce<Record<string, AttributeInputValue>>(
      (result, [key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          result[key] = value;
        }
        return result;
      },
      {}
    ),
  };
};

const CreateServicePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit') || '';
  const { serviceCategories, fetchCategories } = useCategoryStore();
  const [form, setForm] = React.useState<ServiceFormState>(defaultForm);
  const [loading, setLoading] = React.useState(false);
  const [loadingInitial, setLoadingInitial] = React.useState(!!editId);
  const [capturedLocationSource, setCapturedLocationSource] = React.useState<'district' | 'live' | ''>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  React.useEffect(() => {
    const fetchForEdit = async () => {
      if (!editId) {
        setLoadingInitial(false);
        return;
      }

      try {
        const { data } = await servicesApi.getById(editId);
        setForm(toFormValues(data.data));
        setCapturedLocationSource(data.data.location?.coordinates?.coordinates ? 'district' : '');
      } catch {
        toast.error('Unable to load service ad for edit.');
        navigate('/dashboard/services/posted');
      } finally {
        setLoadingInitial(false);
      }
    };

    void fetchForEdit();
  }, [editId, navigate]);

  const selectedCategory = React.useMemo(
    () => serviceCategories.find((category) => category._id === form.categoryId),
    [form.categoryId, serviceCategories]
  );

  React.useEffect(() => {
    setForm((prev) => {
      if (!selectedCategory) {
        return { ...prev, attributeValues: {} };
      }

      const nextValues = selectedCategory.attributes.reduce<Record<string, AttributeInputValue>>((result, attribute) => {
        if (prev.attributeValues[attribute.fieldName] !== undefined) {
          result[attribute.fieldName] = prev.attributeValues[attribute.fieldName];
        }
        return result;
      }, {});

      return { ...prev, attributeValues: nextValues };
    });
  }, [selectedCategory]);

  const handleDistrictChange = (districtName: string) => {
    const district = SRI_LANKAN_DISTRICTS.find((item) => item.name === districtName);

    setForm((prev) => ({
      ...prev,
      district: districtName,
      locationText: districtName || prev.locationText,
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

  const handleSelectImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

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

  const handleRemoveImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const handleAttributeChange = (fieldName: string, value: AttributeInputValue) => {
    setForm((prev) => ({
      ...prev,
      attributeValues: {
        ...prev.attributeValues,
        [fieldName]: value,
      },
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateForm(form, selectedCategory);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId,
      price: Number(form.price),
      pricingType: form.pricingType,
      locationText: form.locationText.trim(),
      images: form.images,
      attributeValues: normalizeAttributeValues(selectedCategory, form.attributeValues),
      ...(form.latitude.trim() && form.longitude.trim() && form.district.trim()
        ? {
            location: {
              city: form.district.trim(),
              address: form.address.trim() || undefined,
              coordinates: {
                type: 'Point' as const,
                coordinates: [Number(form.longitude), Number(form.latitude)] as [number, number],
              },
            },
          }
        : {}),
    };

    try {
      setLoading(true);
      if (editId) {
        await servicesApi.update(editId, payload);
        toast.success('Service ad updated successfully.');
      } else {
        await servicesApi.create(payload);
        toast.success('Service ad created successfully.');
      }
      navigate('/dashboard/services/posted');
    } catch {
      setLoading(false);
    }
  };

  if (loadingInitial) {
    return <FullPageLoader label="Loading service data..." />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{editId ? 'Edit Service Ad' : 'Post a Service'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {editId
              ? 'Update your service details while keeping the category-based service structure intact.'
              : 'Create a service ad with category-based details so buyers can discover and book you.'}
          </p>
        </div>
        <Link to="/dashboard/services/posted" className="btn-secondary text-sm">
          Back to My Posted Services
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">Service Details</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Title</label>
              <input className="input-field py-2" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} maxLength={100} required />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
              <textarea className="input-field py-2" rows={5} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} maxLength={2000} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
              <select className="input-field py-2" value={form.categoryId} onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))} required>
                <option value="">Select a service category</option>
                {serviceCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Pricing Type</label>
              <select className="input-field py-2" value={form.pricingType} onChange={(event) => setForm((prev) => ({ ...prev, pricingType: event.target.value as PricingType }))}>
                <option value="FIXED">Fixed Price</option>
                <option value="HOURLY">Hourly Rate</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Price {form.pricingType === 'HOURLY' ? '(per hour)' : ''}</label>
              <input type="number" min={0} className="input-field py-2" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Location Text</label>
              <input className="input-field py-2" value={form.locationText} onChange={(event) => setForm((prev) => ({ ...prev, locationText: event.target.value }))} placeholder="Ja-Ela, Colombo, online, at customer location..." maxLength={120} required />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">Category Attributes</h2>
          <p className="mt-1 text-sm text-slate-500">These fields are based on the service category selected by the admin.</p>

          {!selectedCategory && (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Select a service category to load its custom fields.
            </div>
          )}

          {selectedCategory && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {selectedCategory.attributes.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500 md:col-span-2">
                  This category has no custom attributes configured.
                </div>
              )}

              {selectedCategory.attributes.map((attribute) => (
                <div key={attribute.fieldName}>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    {attribute.fieldName}
                    {attribute.required ? ' *' : ''}
                  </label>
                  {renderAttributeInput(attribute, form.attributeValues[attribute.fieldName], (value) => handleAttributeChange(attribute.fieldName, value))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">Images</h2>
          <p className="mt-1 text-sm text-slate-500">Upload images for your service gallery. Buyers will see these on the ad card and booking page.</p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-500">Service Photos (max {MAX_IMAGES})</label>
              <div className="flex h-[42px] w-full items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-sm text-slate-500">
                {form.images.length} / {MAX_IMAGES} images selected
              </div>
            </div>
            <div className="flex items-end">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={(event) => void handleSelectImages(event)}
              />
              <Button type="button" variant="outline" size="md" leftIcon={<FiPlus size={16} />} onClick={() => fileInputRef.current?.click()}>
                Select Images
              </Button>
            </div>
          </div>

          {form.images.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {form.images.map((image, index) => (
                <div key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <img src={image} alt={`Service image ${index + 1}`} className="h-44 w-full object-cover" />
                  <div className="flex items-center justify-end gap-3 p-3">
                    <button type="button" onClick={() => handleRemoveImage(index)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                      <FiTrash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">Location & Coverage</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">District</label>
              <select className="input-field py-2" value={form.district} onChange={(event) => handleDistrictChange(event.target.value)}>
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
              <input className="input-field py-2" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">Geo location</p>
                  <Button type="button" variant="outline" size="sm" leftIcon={<FiCrosshair size={14} />} onClick={handleUseLiveLocation}>
                    Use Live Location
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {form.latitude && form.longitude
                    ? `Latitude: ${Number(form.latitude).toFixed(6)}, Longitude: ${Number(form.longitude).toFixed(6)} (${capturedLocationSource === 'live' ? 'live location' : 'district center'})`
                    : 'Selecting a district or using live location enables geo-based discovery, but your service can still be created with location text only.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isLoading={loading} leftIcon={<FiSave size={16} />}>
            {editId ? 'Update Service Ad' : 'Create Service Ad'}
          </Button>
          <Link to="/dashboard/services/posted" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default CreateServicePage;
