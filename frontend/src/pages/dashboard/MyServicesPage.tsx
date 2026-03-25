import React from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiClock,
  FiMapPin,
  FiPlus,
  FiX,
} from 'react-icons/fi';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { bookingsApi, servicesApi } from '@/api/services';
import { BookingStatus, IServiceBooking, IServiceSelling } from '@/types';
import { formatCurrency } from '@/utils/listings';
import { useAuthStore } from '@/store/authStore';

const dateTimeFormatter = new Intl.DateTimeFormat('en-LK', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const shortDateFormatter = new Intl.DateTimeFormat('en-LK', {
  dateStyle: 'medium',
});

const timeFormatter = new Intl.DateTimeFormat('en-LK', {
  timeStyle: 'short',
});

const getServiceId = (service: IServiceBooking['serviceId']) =>
  typeof service === 'string' ? service : service?._id || '';

const TABLE_STATUSES: BookingStatus[] = ['PROVIDER_ACCEPTED', 'CONFIRMED', 'CANCELLED'];

const getBuyerName = (buyer: IServiceBooking['buyerId']) =>
  typeof buyer === 'string' ? `Buyer ID: ${buyer}` : buyer?.name || 'Buyer';

const getStatusBadge = (status: BookingStatus) => {
  if (status === 'PROVIDER_ACCEPTED') {
    return <Badge variant="info">ACCEPTED</Badge>;
  }

  if (status === 'CONFIRMED') {
    return <Badge variant="success">PAID</Badge>;
  }

  return <Badge variant="neutral">CANCELLED</Badge>;
};

const MyServicesPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [bookings, setBookings] = React.useState<IServiceBooking[]>([]);
  const [services, setServices] = React.useState<IServiceSelling[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actingId, setActingId] = React.useState('');
  const dismissStorageKey = React.useMemo(
    () => `provider-dismissed-cancelled-bookings:${user?.id || 'unknown'}`,
    [user?.id]
  );
  const [dismissedCancelledIds, setDismissedCancelledIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(dismissStorageKey);
      setDismissedCancelledIds(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      setDismissedCancelledIds([]);
    }
  }, [dismissStorageKey]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: bookingsResponse }, { data: servicesResponse }] = await Promise.all([
        bookingsApi.getProviderBookings(),
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

  const pendingBookings = React.useMemo(
    () => visibleBookings.filter((booking) => booking.status === 'PENDING'),
    [visibleBookings]
  );

  const acceptedBookings = React.useMemo(
    () =>
      visibleBookings.filter((booking) => {
        if (!TABLE_STATUSES.includes(booking.status)) {
          return false;
        }

        if (booking.status === 'CANCELLED' && dismissedCancelledIds.includes(booking._id)) {
          return false;
        }

        return true;
      }),
    [dismissedCancelledIds, visibleBookings]
  );

  const confirmedBookingsCount = React.useMemo(
    () => acceptedBookings.filter((booking) => booking.status === 'CONFIRMED').length,
    [acceptedBookings]
  );

  const handleDismissCancelled = React.useCallback(
    (bookingId: string) => {
      const next = [...new Set([...dismissedCancelledIds, bookingId])];
      setDismissedCancelledIds(next);
      window.localStorage.setItem(dismissStorageKey, JSON.stringify(next));
    },
    [dismissStorageKey, dismissedCancelledIds]
  );

  const handleDecision = async (bookingId: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      setActingId(`${bookingId}:${action}`);
      await bookingsApi.decision(bookingId, action);
      toast.success(
        action === 'ACCEPT'
          ? 'Booking request accepted. The buyer can now proceed to payment.'
          : 'Booking request rejected. The buyer will see the updated status.'
      );
      await fetchData();
    } catch {
      // global toast handles API errors
    } finally {
      setActingId('');
    }
  };

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
          <p className="mt-2 text-3xl font-bold text-slate-800">{loading ? '...' : pendingBookings.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-sm text-slate-500">Tracked Requests</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{loading ? '...' : acceptedBookings.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-sm text-slate-500">Confirmed Bookings</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{loading ? '...' : confirmedBookingsCount}</p>
        </div>
      </div>

      {loading && (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading service requests...
        </p>
      )}

      {!loading && pendingBookings.length === 0 && acceptedBookings.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">No booking requests right now</h2>
          <p className="mt-2 text-sm text-slate-500">
            Once buyers request bookings for your service ads, pending ones will appear as cards and accepted ones will
            move into the table.
          </p>
        </div>
      )}

      {!loading && pendingBookings.length > 0 && (
        <div className="space-y-4">
          {pendingBookings.map((booking) => {
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

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    size="sm"
                    leftIcon={<FiCheck size={14} />}
                    isLoading={actingId === `${booking._id}:ACCEPT`}
                    disabled={!!actingId && actingId !== `${booking._id}:ACCEPT`}
                    onClick={() => void handleDecision(booking._id, 'ACCEPT')}
                  >
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<FiX size={14} />}
                    isLoading={actingId === `${booking._id}:REJECT`}
                    disabled={!!actingId && actingId !== `${booking._id}:REJECT`}
                    onClick={() => void handleDecision(booking._id, 'REJECT')}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && acceptedBookings.length > 0 && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Accepted Requests</h2>
            <p className="mt-1 text-sm text-slate-500">
                Approved requests, paid bookings, and buyer cancellations are grouped here.
            </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Active Ads</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{loading ? '...' : activeServiceCount}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Service
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Buyer
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Day
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Time
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Duration
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Location
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {acceptedBookings.map((booking) => {
                  const service = servicesById[getServiceId(booking.serviceId)];

                  return (
                    <tr key={booking._id} className="align-top hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-slate-800">{service?.title || 'Service request'}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                            Request #{booking._id.slice(-6)}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{getBuyerName(booking.buyerId)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                          {shortDateFormatter.format(new Date(booking.startAt))}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800">
                          {timeFormatter.format(new Date(booking.startAt))}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-700">{booking.durationMinutes} min</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{service?.locationText || 'Location unavailable'}</td>
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          {getStatusBadge(booking.status)}
                          <p
                            className={`text-xs ${
                              booking.status === 'CONFIRMED'
                                ? 'text-emerald-700'
                                : booking.status === 'CANCELLED'
                                  ? 'text-slate-500'
                                  : 'text-amber-700'
                            }`}
                          >
                            {booking.status === 'CONFIRMED'
                              ? booking.deposit?.paidAt
                                ? `Paid on ${dateTimeFormatter.format(new Date(booking.deposit.paidAt))}`
                                : 'Buyer completed payment and the booking is locked in.'
                              : booking.status === 'CANCELLED'
                                ? 'Buyer cancelled this request before payment.'
                                : 'Waiting for the buyer to complete the deposit payment.'}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {booking.status === 'CANCELLED' ? (
                          <button
                            type="button"
                            onClick={() => handleDismissCancelled(booking._id)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            aria-label="Remove cancelled request from table"
                          >
                            <FiX size={16} />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyServicesPage;
