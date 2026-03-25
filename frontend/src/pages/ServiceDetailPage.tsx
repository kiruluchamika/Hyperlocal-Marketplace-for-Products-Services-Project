import React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiMapPin,
  FiTag,
} from 'react-icons/fi';
import { bookingsApi, servicesApi } from '@/api/services';
import GeoMapCanvas from '@/components/map/GeoMapCanvas';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import { GeoNearbyItem, IServiceBookingSlot, IServiceSelling } from '@/types';

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const getCategoryName = (service: IServiceSelling) =>
  typeof service.categoryId === 'string' ? 'Service' : service.categoryId?.name || 'Service';

const getMapItems = (service: IServiceSelling): GeoNearbyItem[] => {
  const coords = service.location?.coordinates?.coordinates;

  if (!coords || coords.length !== 2) {
    return [];
  }

  const [lng, lat] = coords;

  return [
    {
      id: service._id,
      type: 'SERVICE',
      title: service.title,
      description: service.description,
      price: service.price,
      pricingType: service.pricingType,
      city: service.location?.city || service.locationText,
      distance: 0,
      sellerId: typeof service.sellerId === 'string' ? service.sellerId : service.sellerId.id,
      categoryId: typeof service.categoryId === 'string' ? service.categoryId : service.categoryId._id,
      location: {
        coordinates: [lat, lng],
        text: service.locationText,
      },
      images: service.images,
      status: service.status,
      isActive: service.isActive,
    },
  ];
};

const isSlotConflict = (startAt: Date, durationMinutes: number, slots: IServiceBookingSlot[]) => {
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

  return slots.some((slot) => {
    const slotStart = new Date(slot.startAt);
    const slotEnd = new Date(slot.endAt);
    return startAt < slotEnd && endAt > slotStart;
  });
};

const ServiceDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const { state } = useLocation() as { state?: { service?: IServiceSelling } };
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [service, setService] = React.useState<IServiceSelling | null>(state?.service || null);
  const [loading, setLoading] = React.useState(!state?.service);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeImage, setActiveImage] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [slots, setSlots] = React.useState<IServiceBookingSlot[]>([]);
  const [isMapVisible, setIsMapVisible] = React.useState(false);
  const [bookingForm, setBookingForm] = React.useState({
    date: formatDateInput(new Date()),
    time: '09:00',
    durationMinutes: 60,
    note: '',
  });

  React.useEffect(() => {
    if (!id) {
      return;
    }

    if (state?.service) {
      setService(state.service);
      setLoading(false);
      return;
    }

    const fetchService = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await servicesApi.getById(id);
        setService(data.data);
        setActiveImage(0);
      } catch {
        if (!state?.service) {
          setError('Sign in from the services page to open this booking page, or try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchService();
  }, [id, isAuthenticated, state?.service]);

  React.useEffect(() => {
    if (!id || !bookingForm.date) {
      return;
    }

    const fetchSlots = async () => {
      setSlotsLoading(true);

      const startOfDay = new Date(`${bookingForm.date}T00:00:00`);
      const endOfDay = new Date(`${bookingForm.date}T23:59:59`);

      try {
        const { data } = await bookingsApi.getSlots({
          serviceId: id,
          from: startOfDay.toISOString(),
          to: endOfDay.toISOString(),
        });
        setSlots(data.data || []);
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    void fetchSlots();
  }, [bookingForm.date, id]);

  const isOwner = service && user ? (typeof service.sellerId === 'string' ? service.sellerId : service.sellerId.id) === user.id : false;
  const images = service?.images?.length ? service.images : [];
  const mapItems = service ? getMapItems(service) : [];
  const selectedStartAt = bookingForm.date && bookingForm.time ? new Date(`${bookingForm.date}T${bookingForm.time}`) : null;
  const hasConflict =
    !!selectedStartAt &&
    Number.isFinite(selectedStartAt.getTime()) &&
    isSlotConflict(selectedStartAt, bookingForm.durationMinutes, slots);

  const handleCreateBooking = async () => {
    if (!service) {
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please sign in to request a booking.');
      navigate('/login');
      return;
    }

    if (isOwner) {
      toast.error('You cannot book your own service.');
      return;
    }

    if (!selectedStartAt || !Number.isFinite(selectedStartAt.getTime())) {
      toast.error('Please select a valid booking date and time.');
      return;
    }

    if (selectedStartAt.getTime() <= Date.now()) {
      toast.error('Please choose a future booking time.');
      return;
    }

    if (hasConflict) {
      toast.error('That time overlaps an already confirmed slot.');
      return;
    }

    try {
      setSubmitting(true);
      await bookingsApi.create({
        serviceId: service._id,
        startAt: selectedStartAt.toISOString(),
        durationMinutes: bookingForm.durationMinutes,
        note: bookingForm.note.trim() || undefined,
      });

      toast.success('Booking request submitted. It is now waiting for provider approval.');
      setBookingForm((prev) => ({ ...prev, note: '' }));
      setSubmitting(false);
    } catch {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-slate-500">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h1 className="text-2xl font-bold text-slate-800">Service unavailable</h1>
            <p className="mt-2 text-sm text-slate-500">{error || 'This service could not be loaded.'}</p>
            <div className="mt-4 flex gap-2">
              <Link to="/services" className="btn-secondary">
                Back to Services
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700"
        >
          <FiArrowLeft size={16} /> Back to results
        </button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              {images.length > 0 ? (
                <img
                  src={images[activeImage]}
                  alt={service.title}
                  className="h-[280px] w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-[280px] w-full items-end rounded-xl bg-gradient-to-br from-primary-600 via-indigo-500 to-sky-400 p-8">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">{getCategoryName(service)}</p>
                    <h1 className="mt-2 text-4xl font-bold text-white">{service.title}</h1>
                  </div>
                </div>
              )}

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
                      <img src={image} alt={`${service.title} ${index + 1}`} className="h-16 w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary">{service.pricingType === 'HOURLY' ? 'Hourly Service' : 'Fixed Service'}</Badge>
                <Badge variant="neutral">{getCategoryName(service)}</Badge>
                <Badge variant="info">{service.status}</Badge>
              </div>

              <h1 className="mt-3 text-3xl font-bold text-slate-800">{service.title}</h1>

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1"><FiTag size={14} /> LKR {service.price.toLocaleString()}</span>
                <span className="inline-flex items-center gap-1"><FiMapPin size={14} /> {service.location?.city || service.locationText}</span>
                <span className="inline-flex items-center gap-1"><FiCalendar size={14} /> {new Date(service.createdAt).toLocaleDateString()}</span>
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{service.description}</p>
            </div>

            {mapItems.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Location Map</h2>
                    <p className="mt-1 text-xs text-slate-500">Open only when you need a quick location view.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapVisible((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700"
                  >
                    {isMapVisible ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    {isMapVisible ? 'Hide Map' : 'Show Map'}
                  </button>
                </div>

                {isMapVisible && (
                  <div className="mt-4">
                    <GeoMapCanvas
                      center={mapItems[0].location!.coordinates!}
                      radiusKm={3}
                      items={mapItems}
                      selectedItemId={service._id}
                      onCenterChange={() => undefined}
                      onSelectItem={() => undefined}
                      heightClassName="h-[200px]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-800">Confirmed Slots</h2>
                <span className="text-xs font-medium text-slate-500">{bookingForm.date}</span>
              </div>

              {slotsLoading && <p className="mt-3 text-sm text-slate-500">Loading confirmed slots...</p>}

              {!slotsLoading && slots.length === 0 && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <span className="inline-flex items-center gap-2 font-semibold"><FiCheckCircle size={14} /> No confirmed bookings found for this date.</span>
                </div>
              )}

              {!slotsLoading && slots.length > 0 && (
                <div className="mt-3 space-y-2">
                  {slots.map((slot) => (
                    <div key={`${slot.startAt}-${slot.endAt}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">This time is already confirmed and unavailable.</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 via-white to-indigo-50 p-5 shadow-card">
              <h2 className="text-lg font-bold text-slate-800">Request Booking</h2>
              <p className="mt-2 text-sm text-slate-600">
                Choose a date, time, and duration to submit your booking request for this service.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Booking date</label>
                  <input
                    type="date"
                    min={formatDateInput(new Date())}
                    value={bookingForm.date}
                    onChange={(event) => setBookingForm((prev) => ({ ...prev, date: event.target.value }))}
                    className="input-field py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Start time</label>
                  <input
                    type="time"
                    value={bookingForm.time}
                    onChange={(event) => setBookingForm((prev) => ({ ...prev, time: event.target.value }))}
                    className="input-field py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Duration</label>
                  <select
                    value={bookingForm.durationMinutes}
                    onChange={(event) =>
                      setBookingForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))
                    }
                    className="input-field py-2"
                  >
                    {DURATION_OPTIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutes
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Note to provider</label>
                  <textarea
                    value={bookingForm.note}
                    onChange={(event) => setBookingForm((prev) => ({ ...prev, note: event.target.value }))}
                    rows={3}
                    className="input-field py-2"
                    placeholder="Add any instructions for the booking request"
                  />
                </div>

                <div className="rounded-xl bg-white/80 p-3 text-sm text-slate-700 ring-1 ring-primary-100">
                  <p className="font-semibold text-slate-800">Deposit logic</p>
                  <p className="mt-1">
                    {service.pricingType === 'HOURLY'
                      ? `If accepted, the payment page will show the full hourly price of LKR ${service.price.toLocaleString()} as the deposit.`
                      : `If accepted, the payment page will show a 20% deposit of LKR ${Math.round(service.price * 0.2).toLocaleString()}.`}
                  </p>
                </div>

                {hasConflict && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    <span className="inline-flex items-center gap-2 font-semibold"><FiAlertCircle size={14} /> This selection overlaps a confirmed slot.</span>
                  </div>
                )}

                {!isAuthenticated ? (
                  <Link to="/login" className="btn-secondary block w-full text-center">
                    Sign in to request booking
                  </Link>
                ) : (
                  <Button type="button" fullWidth isLoading={submitting} onClick={handleCreateBooking}>
                    Request Booking
                  </Button>
                )}

                {isOwner && (
                  <p className="text-xs font-medium text-amber-700">You are the owner of this service ad, so booking is disabled.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-lg font-bold text-slate-800">Booking Information</h2>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div>
                  <p className="font-semibold text-slate-800">Step 1</p>
                  <p className="mt-1">Submit your preferred date, time, and duration to create a booking request.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Step 2</p>
                  <p className="mt-1">The provider reviews the request and accepts or rejects it.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Step 3</p>
                  <p className="mt-1">If accepted, the deposit payment confirms the booking and finalizes the slot.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailPage;
