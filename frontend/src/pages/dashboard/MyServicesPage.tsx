import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCalendar, FiClock, FiMapPin, FiPlus } from 'react-icons/fi';
import Badge from '@/components/ui/Badge';
import { bookingsApi, servicesApi } from '@/api/services';
import { IServiceBooking, IServiceSelling } from '@/types';
import { formatCurrency } from '@/utils/listings';

const dateTimeFormatter = new Intl.DateTimeFormat('en-LK', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const shortDateFormatter = new Intl.DateTimeFormat('en-LK', {
  dateStyle: 'medium',
});

const getServiceId = (service: IServiceBooking['serviceId']) =>
  typeof service === 'string' ? service : service?._id || '';

const MyServicesPage: React.FC = () => {
  const [bookings, setBookings] = React.useState<IServiceBooking[]>([]);
  const [services, setServices] = React.useState<IServiceSelling[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: bookingsResponse }, { data: servicesResponse }] = await Promise.all([
        bookingsApi.getProviderBookings({ status: 'PENDING' }),
        servicesApi.getMyServices(),
      ]);

      setBookings(bookingsResponse.data || []);
      setServices(servicesResponse.data || []);
    } catch {
      setBookings([]);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const servicesById = React.useMemo(
    () =>
      services.reduce<Record<string, IServiceSelling>>((result, service) => {
        result[service._id] = service;
        return result;
      }, {}),
    [services]
  );

  const visibleBookings = React.useMemo(
    () =>
      bookings.filter((booking) => {
        const service = servicesById[getServiceId(booking.serviceId)];
        return !!service && service.status === 'ACTIVE' && service.isActive !== false;
      }),
    [bookings, servicesById]
  );

  const activeServiceCount = services.filter((service) => service.status === 'ACTIVE').length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Services</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review the pending booking requests that came in for your posted service ads.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/dashboard/services/new" className="btn-primary inline-flex items-center gap-2 text-sm">
            <FiPlus size={16} /> Post Service
          </Link>
          <Link
            to="/dashboard/services/posted"
            className="inline-flex items-center gap-2 rounded-xl border border-primary-200 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            My Posted Services <FiArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-sm text-slate-500">Pending Requests</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{loading ? '...' : visibleBookings.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-sm text-slate-500">Posted Services</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{loading ? '...' : services.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-sm text-slate-500">Active Ads</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{loading ? '...' : activeServiceCount}</p>
        </div>
      </div>

      {loading && (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading service requests...
        </p>
      )}

      {!loading && visibleBookings.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">No pending requests right now</h2>
          <p className="mt-2 text-sm text-slate-500">
            Once buyers request bookings for your service ads, they will appear here.
          </p>
        </div>
      )}

      {!loading && visibleBookings.length > 0 && (
        <div className="space-y-4">
          {visibleBookings.map((booking) => {
            const service = servicesById[getServiceId(booking.serviceId)];

            return (
              <div key={booking._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="warning">PENDING</Badge>
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        Request #{booking._id.slice(-6)}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-slate-800">
                      {service?.title || 'Service request'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Requested on {shortDateFormatter.format(new Date(booking.createdAt))}
                    </p>
                  </div>

                  {service && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-500">Ad Price</p>
                      <p className="mt-1 text-lg font-semibold text-slate-800">
                        {formatCurrency(service.price)}
                        {service.pricingType === 'HOURLY' ? ' / hour' : ''}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Schedule</p>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <FiCalendar size={14} />
                      {dateTimeFormatter.format(new Date(booking.startAt))}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Duration</p>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <FiClock size={14} />
                      {booking.durationMinutes} minutes
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Service Location</p>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <FiMapPin size={14} />
                      {service?.locationText || 'Location unavailable'}
                    </p>
                  </div>
                </div>

                {booking.note && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-primary-50/50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary-600">Buyer Note</p>
                    <p className="mt-2 text-sm text-slate-700">{booking.note}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyServicesPage;
