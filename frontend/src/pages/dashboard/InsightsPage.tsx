import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiBarChart2,
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiEye,
  FiLayers,
  FiPackage,
  FiTrendingDown,
  FiTrendingUp,
} from 'react-icons/fi';
import { bookingsApi, servicesApi } from '@/api/services';
import { listingsApi } from '@/api/listings';
import GifLoader from '@/components/ui/GifLoader';
import Badge from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import type { IProductListing } from '@/types/listing';
import type { IServiceBooking, IServiceSelling } from '@/types/service';
import { formatCurrency } from '@/utils/listings';
import { orderManagementApi } from './orders/orderManagementApi';
import type { ManagedOrder, ManagedPayment } from './orders/orderManagementTypes';

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
};

type HighlightItem = {
  label: string;
  title?: string;
  subtitle?: string;
  metric?: string;
  emptyMessage: string;
};

type BreakdownRow = {
  label: string;
  count: number;
};

type ProductInsights = {
  totalListings: number;
  activeListings: number;
  inactiveListings: number;
  soldListings: number;
  totalOrders: number;
  totalRevenue: number | null;
  topSellingProduct: HighlightItem;
  bestPerformingProduct: HighlightItem;
  mostViewedProduct: HighlightItem;
  topCategory: HighlightItem;
  lowEngagementProduct: HighlightItem;
  statusBreakdown: BreakdownRow[];
  recentActivity: ActivityItem[];
};

type ServiceInsights = {
  totalListings: number;
  activeListings: number;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number | null;
  mostBookedService: HighlightItem;
  topPerformingService: HighlightItem;
  topCategory: HighlightItem;
  lowestPerformingService: HighlightItem;
  bookingBreakdown: BreakdownRow[];
  recentActivity: ActivityItem[];
};

const DATE_FORMATTER = new Intl.DateTimeFormat('en-LK', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatDateTime = (value?: string) => {
  if (!value) return 'Date unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';
  return DATE_FORMATTER.format(parsed);
};

const normalizeCollection = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.data)) {
      return record.data as T[];
    }

    if (Array.isArray(record.bookings)) {
      return record.bookings as T[];
    }

    if (Array.isArray(record.orders)) {
      return record.orders as T[];
    }
  }

  return [];
};

const getProductCategoryName = (listing: IProductListing) => {
  if (typeof listing.categoryId === 'string') {
    return 'Uncategorized';
  }

  return listing.categoryId?.name || 'Uncategorized';
};

const getServiceCategoryName = (service: IServiceSelling) => {
  if (typeof service.categoryId === 'string') {
    return 'Uncategorized';
  }

  return service.categoryId?.name || 'Uncategorized';
};

const getServiceTitle = (service: IServiceSelling | string | undefined) => {
  if (!service || typeof service === 'string') {
    return 'Service listing';
  }

  return service.title || 'Service listing';
};

const buildTopCategoryHighlight = (
  label: string,
  bucket: Map<string, { count: number; secondaryMetric: number }>,
  emptyMessage: string,
  singularLabel: string
): HighlightItem => {
  const winner = [...bucket.entries()].sort((first, second) => {
    if (second[1].count !== first[1].count) {
      return second[1].count - first[1].count;
    }

    return second[1].secondaryMetric - first[1].secondaryMetric;
  })[0];

  if (!winner) {
    return { label, emptyMessage };
  }

  return {
    label,
    title: winner[0],
    subtitle: `${winner[1].count} ${singularLabel}${winner[1].count === 1 ? '' : 's'}`,
    metric: `${winner[1].count}`,
    emptyMessage,
  };
};

const buildBreakdownRows = (rows: BreakdownRow[]) => rows.filter((row) => row.count > 0);

const fetchAllOrders = async () => {
  const allOrders: ManagedOrder[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await orderManagementApi.listOrders({ page, limit: 100 });
    allOrders.push(...response.orders);
    totalPages = Math.max(1, response.pagination.totalPages || 1);
    page += 1;
  } while (page <= totalPages);

  return allOrders;
};

const createProductInsights = (
  listings: IProductListing[],
  orders: ManagedOrder[],
  paymentsByOrderId: Record<string, ManagedPayment | null>
): ProductInsights => {
  const listingIds = new Set(listings.map((listing) => listing._id));
  const relevantOrders = orders.filter((order) => listingIds.has(order.listingId));

  const orderCounts = new Map<string, number>();
  const revenueByListing = new Map<string, number>();

  for (const order of relevantOrders) {
    orderCounts.set(order.listingId, (orderCounts.get(order.listingId) || 0) + 1);

    const payment = paymentsByOrderId[order.id];
    if (payment && (payment.status === 'HELD' || payment.status === 'RELEASED')) {
      revenueByListing.set(order.listingId, (revenueByListing.get(order.listingId) || 0) + payment.amount);
    }
  }

  const listingsWithStats = listings.map((listing) => {
    const orderCount = orderCounts.get(listing._id) || 0;
    const revenue = revenueByListing.get(listing._id) || 0;
    const views = listing.viewsCount || 0;
    const score = orderCount * 1000 + revenue + views * 10;

    return {
      listing,
      orderCount,
      revenue,
      views,
      score,
    };
  });

  const totalRevenue = [...revenueByListing.values()].reduce((sum, value) => sum + value, 0);
  const activeListings = listings.filter((listing) => listing.status === 'ACTIVE').length;
  const soldListings = listings.filter((listing) => listing.status === 'SOLD').length;
  const inactiveListings = listings.filter((listing) => listing.status !== 'ACTIVE').length;

  const topSelling = [...listingsWithStats].sort((first, second) => {
    if (second.orderCount !== first.orderCount) {
      return second.orderCount - first.orderCount;
    }

    return second.revenue - first.revenue;
  })[0];

  const bestPerforming = [...listingsWithStats].sort((first, second) => second.score - first.score)[0];
  const mostViewed = [...listingsWithStats].sort((first, second) => second.views - first.views)[0];

  const lowEngagementCandidate = [...listingsWithStats]
    .filter((item) => item.orderCount === 0 || item.views <= 3)
    .sort((first, second) => {
      if (first.orderCount !== second.orderCount) {
        return first.orderCount - second.orderCount;
      }

      return first.views - second.views;
    })[0];

  const categories = new Map<string, { count: number; secondaryMetric: number }>();
  for (const listing of listings) {
    const name = getProductCategoryName(listing);
    const current = categories.get(name) || { count: 0, secondaryMetric: 0 };
    categories.set(name, {
      count: current.count + 1,
      secondaryMetric: current.secondaryMetric + (listing.viewsCount || 0),
    });
  }

  const activity = [
    ...listings.map<ActivityItem>((listing) => ({
      id: `product-listing-${listing._id}`,
      title: listing.title,
      description:
        listing.status === 'ACTIVE'
          ? 'Listing is live'
          : `Listing status is ${listing.status.toLowerCase().replace(/_/g, ' ')}`,
      occurredAt: listing.updatedAt || listing.createdAt,
    })),
    ...relevantOrders.map<ActivityItem>((order) => ({
      id: `product-order-${order.id}`,
      title: order.titleSnapshot || 'Product order',
      description: `Order ${order.status.toLowerCase().replace(/_/g, ' ')} for ${order.quantity} item${order.quantity === 1 ? '' : 's'}`,
      occurredAt: order.updatedAt || order.createdAt,
    })),
  ]
    .sort((first, second) => new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime())
    .slice(0, 5);

  return {
    totalListings: listings.length,
    activeListings,
    inactiveListings,
    soldListings,
    totalOrders: relevantOrders.length,
    totalRevenue: totalRevenue > 0 ? totalRevenue : null,
    topSellingProduct:
      topSelling && topSelling.orderCount > 0
        ? {
            label: 'Top Selling Product',
            title: topSelling.listing.title,
            subtitle: `${topSelling.orderCount} order${topSelling.orderCount === 1 ? '' : 's'}`,
            metric: topSelling.revenue > 0 ? formatCurrency(topSelling.revenue) : `${topSelling.orderCount} orders`,
            emptyMessage: 'No orders yet',
          }
        : { label: 'Top Selling Product', emptyMessage: 'No orders yet' },
    bestPerformingProduct:
      bestPerforming && (bestPerforming.orderCount > 0 || bestPerforming.views > 0)
        ? {
            label: 'Best Performing Product',
            title: bestPerforming.listing.title,
            subtitle: `${bestPerforming.orderCount} orders and ${bestPerforming.views} views`,
            metric: bestPerforming.revenue > 0 ? formatCurrency(bestPerforming.revenue) : `${bestPerforming.views} views`,
            emptyMessage: 'Not enough data to determine top performer',
          }
        : { label: 'Best Performing Product', emptyMessage: 'Not enough data to determine top performer' },
    mostViewedProduct:
      mostViewed && mostViewed.views > 0
        ? {
            label: 'Most Viewed Product',
            title: mostViewed.listing.title,
            subtitle: `${mostViewed.views} view${mostViewed.views === 1 ? '' : 's'}`,
            metric: `${mostViewed.views} views`,
            emptyMessage: 'View tracking is not available yet',
          }
        : { label: 'Most Viewed Product', emptyMessage: 'View tracking is not available yet' },
    topCategory: buildTopCategoryHighlight('Top Product Category', categories, 'No products yet', 'listing'),
    lowEngagementProduct: lowEngagementCandidate
      ? {
          label: 'Low Engagement Product',
          title: lowEngagementCandidate.listing.title,
          subtitle:
            lowEngagementCandidate.orderCount > 0
              ? `${lowEngagementCandidate.orderCount} orders and ${lowEngagementCandidate.views} views`
              : `${lowEngagementCandidate.views} view${lowEngagementCandidate.views === 1 ? '' : 's'} so far`,
          metric: `${lowEngagementCandidate.views} views`,
          emptyMessage: 'No low-engagement products found',
        }
      : { label: 'Low Engagement Product', emptyMessage: 'No low-engagement products found' },
    statusBreakdown: buildBreakdownRows([
      { label: 'Active', count: activeListings },
      { label: 'Sold', count: soldListings },
      { label: 'Hidden', count: listings.filter((listing) => listing.status === 'HIDDEN').length },
      { label: 'Under review', count: listings.filter((listing) => listing.status === 'UNDER_REVIEW').length },
      { label: 'Suspended', count: listings.filter((listing) => listing.status === 'SUSPENDED').length },
      { label: 'Deleted', count: listings.filter((listing) => listing.status === 'DELETED').length },
    ]),
    recentActivity: activity,
  };
};

const createServiceInsights = (
  services: IServiceSelling[],
  bookings: IServiceBooking[]
): ServiceInsights => {
  const serviceIds = new Set(services.map((service) => service._id));
  const relevantBookings = bookings.filter((booking) => {
    const serviceId = typeof booking.serviceId === 'string' ? booking.serviceId : booking.serviceId?._id || '';
    return serviceIds.has(serviceId);
  });

  const bookingCounts = new Map<string, number>();
  const confirmedCounts = new Map<string, number>();
  const revenueByService = new Map<string, number>();

  for (const booking of relevantBookings) {
    const serviceId = typeof booking.serviceId === 'string' ? booking.serviceId : booking.serviceId?._id || '';
    if (!serviceId) continue;

    bookingCounts.set(serviceId, (bookingCounts.get(serviceId) || 0) + 1);

    if (booking.status === 'CONFIRMED') {
      confirmedCounts.set(serviceId, (confirmedCounts.get(serviceId) || 0) + 1);

      if (typeof booking.deposit?.amount === 'number' && booking.deposit.amount > 0) {
        revenueByService.set(serviceId, (revenueByService.get(serviceId) || 0) + booking.deposit.amount);
      }
    }
  }

  const servicesWithStats = services.map((service) => {
    const bookingCount = bookingCounts.get(service._id) || 0;
    const confirmed = confirmedCounts.get(service._id) || 0;
    const revenue = revenueByService.get(service._id) || 0;
    const views = service.viewsCount || 0;
    const score = bookingCount * 1000 + confirmed * 400 + revenue + views * 10;

    return {
      service,
      bookingCount,
      confirmed,
      revenue,
      views,
      score,
    };
  });

  const totalRevenue = [...revenueByService.values()].reduce((sum, value) => sum + value, 0);
  const activeListings = services.filter((service) => service.status === 'ACTIVE' && service.isActive !== false).length;
  const completedBookings = relevantBookings.filter((booking) => booking.status === 'CONFIRMED').length;
  const pendingBookings = relevantBookings.filter(
    (booking) => booking.status === 'PENDING' || booking.status === 'PROVIDER_ACCEPTED'
  ).length;
  const cancelledBookings = relevantBookings.filter(
    (booking) => booking.status === 'CANCELLED' || booking.status === 'REJECTED'
  ).length;

  const mostBooked = [...servicesWithStats].sort((first, second) => second.bookingCount - first.bookingCount)[0];
  const bestPerforming = [...servicesWithStats].sort((first, second) => second.score - first.score)[0];
  const lowPerformer = [...servicesWithStats]
    .filter((item) => item.bookingCount === 0 || item.views <= 3)
    .sort((first, second) => {
      if (first.bookingCount !== second.bookingCount) {
        return first.bookingCount - second.bookingCount;
      }

      return first.views - second.views;
    })[0];

  const categories = new Map<string, { count: number; secondaryMetric: number }>();
  for (const service of services) {
    const name = getServiceCategoryName(service);
    const current = categories.get(name) || { count: 0, secondaryMetric: 0 };
    categories.set(name, {
      count: current.count + 1,
      secondaryMetric: current.secondaryMetric + (service.viewsCount || 0),
    });
  }

  const activity = [
    ...services.map<ActivityItem>((service) => ({
      id: `service-listing-${service._id}`,
      title: service.title,
      description:
        service.status === 'ACTIVE'
          ? 'Service is available for bookings'
          : `Service status is ${service.status.toLowerCase()}`,
      occurredAt: service.updatedAt || service.createdAt,
    })),
    ...relevantBookings.map<ActivityItem>((booking) => ({
      id: `service-booking-${booking._id}`,
      title: getServiceTitle(typeof booking.serviceId === 'string' ? undefined : booking.serviceId),
      description: `Booking ${booking.status.toLowerCase().replace(/_/g, ' ')}`,
      occurredAt: booking.updatedAt || booking.createdAt,
    })),
  ]
    .sort((first, second) => new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime())
    .slice(0, 5);

  return {
    totalListings: services.length,
    activeListings,
    totalBookings: relevantBookings.length,
    completedBookings,
    pendingBookings,
    cancelledBookings,
    totalRevenue: totalRevenue > 0 ? totalRevenue : null,
    mostBookedService:
      mostBooked && mostBooked.bookingCount > 0
        ? {
            label: 'Most Booked Service',
            title: mostBooked.service.title,
            subtitle: `${mostBooked.bookingCount} booking${mostBooked.bookingCount === 1 ? '' : 's'}`,
            metric: `${mostBooked.bookingCount} bookings`,
            emptyMessage: 'No bookings yet',
          }
        : { label: 'Most Booked Service', emptyMessage: 'No bookings yet' },
    topPerformingService:
      bestPerforming && (bestPerforming.bookingCount > 0 || bestPerforming.views > 0)
        ? {
            label: 'Top Performing Service',
            title: bestPerforming.service.title,
            subtitle: `${bestPerforming.bookingCount} bookings and ${bestPerforming.views} views`,
            metric: bestPerforming.revenue > 0 ? formatCurrency(bestPerforming.revenue) : `${bestPerforming.views} views`,
            emptyMessage: 'Not enough data to determine top performer',
          }
        : { label: 'Top Performing Service', emptyMessage: 'Not enough data to determine top performer' },
    topCategory: buildTopCategoryHighlight('Top Service Category', categories, 'No services yet', 'service'),
    lowestPerformingService: lowPerformer
      ? {
          label: 'Lowest Performing Service',
          title: lowPerformer.service.title,
          subtitle:
            lowPerformer.bookingCount > 0
              ? `${lowPerformer.bookingCount} bookings and ${lowPerformer.views} views`
              : `${lowPerformer.views} view${lowPerformer.views === 1 ? '' : 's'} so far`,
          metric: `${lowPerformer.views} views`,
          emptyMessage: 'No low-performing services found',
        }
      : { label: 'Lowest Performing Service', emptyMessage: 'No low-performing services found' },
    bookingBreakdown: buildBreakdownRows([
      { label: 'Pending review', count: relevantBookings.filter((booking) => booking.status === 'PENDING').length },
      {
        label: 'Awaiting payment',
        count: relevantBookings.filter((booking) => booking.status === 'PROVIDER_ACCEPTED').length,
      },
      { label: 'Confirmed', count: completedBookings },
      { label: 'Rejected', count: relevantBookings.filter((booking) => booking.status === 'REJECTED').length },
      { label: 'Cancelled', count: relevantBookings.filter((booking) => booking.status === 'CANCELLED').length },
    ]),
    recentActivity: activity,
  };
};

const InsightsPage: React.FC = () => {
  const currentUserId = useAuthStore((state) => state.user?.id || '');
  const [listings, setListings] = useState<IProductListing[]>([]);
  const [services, setServices] = useState<IServiceSelling[]>([]);
  const [providerBookings, setProviderBookings] = useState<IServiceBooking[]>([]);
  const [sellerOrders, setSellerOrders] = useState<ManagedOrder[]>([]);
  const [paymentsByOrderId, setPaymentsByOrderId] = useState<Record<string, ManagedPayment | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [selectedInsight, setSelectedInsight] = useState<'products' | 'services' | null>(null);

  const loadInsights = useCallback(async () => {
    if (!currentUserId) {
      setListings([]);
      setServices([]);
      setProviderBookings([]);
      setSellerOrders([]);
      setPaymentsByOrderId({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    setWarning('');

    try {
      const [listingsResult, servicesResult, bookingsResult, ordersResult] = await Promise.allSettled([
        listingsApi.getMyActive(),
        servicesApi.getMyServices(),
        bookingsApi.getProviderBookings(),
        fetchAllOrders(),
      ]);

      const partialFailures: string[] = [];

      const productListings =
        listingsResult.status === 'fulfilled'
          ? normalizeCollection<IProductListing>(listingsResult.value.data)
          : [];
      if (listingsResult.status === 'rejected') {
        partialFailures.push('product listings');
      }

      const serviceListings =
        servicesResult.status === 'fulfilled'
          ? normalizeCollection<IServiceSelling>(servicesResult.value.data)
          : [];
      if (servicesResult.status === 'rejected') {
        partialFailures.push('service listings');
      }

      const serviceBookings =
        bookingsResult.status === 'fulfilled'
          ? normalizeCollection<IServiceBooking>(bookingsResult.value.data)
          : [];
      if (bookingsResult.status === 'rejected') {
        partialFailures.push('service bookings');
      }

      const allOrders =
        ordersResult.status === 'fulfilled'
          ? ordersResult.value.filter((order) => order.sellerId === currentUserId)
          : [];
      if (ordersResult.status === 'rejected') {
        partialFailures.push('product orders');
      }

      const paymentEntries = await Promise.allSettled(
        allOrders.map(async (order) => [order.id, await orderManagementApi.getPaymentByOrder(order.id)] as const)
      );

      const nextPayments = paymentEntries.reduce<Record<string, ManagedPayment | null>>((result, entry, index) => {
        const fallbackOrderId = allOrders[index]?.id;

        if (entry.status === 'fulfilled') {
          const [orderId, payment] = entry.value;
          result[orderId] = payment;
          return result;
        }

        if (fallbackOrderId) {
          result[fallbackOrderId] = null;
        }

        return result;
      }, {});

      if (paymentEntries.some((entry) => entry.status === 'rejected')) {
        partialFailures.push('product payments');
      }

      setListings(productListings);
      setServices(serviceListings);
      setProviderBookings(serviceBookings);
      setSellerOrders(allOrders);
      setPaymentsByOrderId(nextPayments);

      if (partialFailures.length > 0) {
        setWarning(`Some insight data could not be loaded fully: ${partialFailures.join(', ')}.`);
      }
    } catch {
      setError('Unable to load your insights right now. Please try again later.');
      setListings([]);
      setServices([]);
      setProviderBookings([]);
      setSellerOrders([]);
      setPaymentsByOrderId({});
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const productInsights = useMemo(
    () => createProductInsights(listings, sellerOrders, paymentsByOrderId),
    [listings, paymentsByOrderId, sellerOrders]
  );

  const serviceInsights = useMemo(
    () => createServiceInsights(services, providerBookings),
    [providerBookings, services]
  );

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <GifLoader size="lg" label="Loading insights..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/60 p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <Badge variant="info" size="md" className="rounded-full px-3 py-1 font-semibold">
              My Insights
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Insights</h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Track how your products and services are performing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
            <QuickInfoCard label="Products" value={productInsights.totalListings} icon={<FiPackage />} />
            <QuickInfoCard label="Services" value={serviceInsights.totalListings} icon={<FiCalendar />} />
            <QuickInfoCard label="Product Orders" value={productInsights.totalOrders} icon={<FiCreditCard />} />
            <QuickInfoCard label="Bookings" value={serviceInsights.totalBookings} icon={<FiActivity />} />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {warning && !error && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warning}
        </div>
      )}

      <div className="mt-8 space-y-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <InsightOverviewCard
            title="Product Insights"
            description="See how your product listings, orders, revenue, and engagement are performing."
            icon={<FiBox className="h-5 w-5" />}
            badgeLabel="Products"
            primaryMetricLabel="Listings"
            primaryMetricValue={productInsights.totalListings}
            secondaryMetricLabel="Orders"
            secondaryMetricValue={productInsights.totalOrders}
            tertiaryMetricLabel="Revenue"
            tertiaryMetricValue={productInsights.totalRevenue !== null ? formatCurrency(productInsights.totalRevenue) : 'Not available'}
            isActive={selectedInsight === 'products'}
            onView={() => setSelectedInsight('products')}
          />

          <InsightOverviewCard
            title="Service Insights"
            description="See how your services, bookings, confirmed activity, and service performance are doing."
            icon={<FiCalendar className="h-5 w-5" />}
            badgeLabel="Services"
            primaryMetricLabel="Listings"
            primaryMetricValue={serviceInsights.totalListings}
            secondaryMetricLabel="Bookings"
            secondaryMetricValue={serviceInsights.totalBookings}
            tertiaryMetricLabel="Revenue"
            tertiaryMetricValue={serviceInsights.totalRevenue !== null ? formatCurrency(serviceInsights.totalRevenue) : 'Not available'}
            isActive={selectedInsight === 'services'}
            onView={() => setSelectedInsight('services')}
          />
        </div>

        {!selectedInsight && (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-900">Choose an insight card to view analytics</p>
            <p className="mt-2 text-sm text-slate-600">
              Product and service analytics stay hidden until you open the one you want to review.
            </p>
          </div>
        )}

        {selectedInsight === 'products' && (
          <InsightsSection
            icon={<FiBox className="h-5 w-5" />}
            title="Product Insights"
            description="Performance trends based only on the products you have listed and the orders tied to them."
          >
            {productInsights.totalListings === 0 ? (
              <EmptyState
                title="No products yet"
                description="Create your first product listing to start seeing product insights here."
                ctaLabel="Create Product Listing"
                ctaTo="/dashboard/listings/new"
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <StatCard title="Total Product Listings" value={productInsights.totalListings} icon={<FiPackage />} tone="sky" />
                  <StatCard title="Active Product Listings" value={productInsights.activeListings} icon={<FiCheckCircle />} tone="emerald" />
                  <StatCard title="Inactive / Sold" value={productInsights.inactiveListings} icon={<FiClock />} tone="amber" />
                  <StatCard title="Total Product Orders" value={productInsights.totalOrders} icon={<FiCreditCard />} tone="indigo" />
                  <StatCard
                    title="Total Product Revenue"
                    value={productInsights.totalRevenue !== null ? formatCurrency(productInsights.totalRevenue) : 'Not available'}
                    icon={<FiDollarSign />}
                    tone="rose"
                  />
                </div>

                <div className="mt-10 grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-4">
                  <HighlightCard item={productInsights.topSellingProduct} accent="emerald" icon={<FiTrendingUp />} />
                  <HighlightCard item={productInsights.bestPerformingProduct} accent="indigo" icon={<FiBarChart2 />} />
                  <HighlightCard item={productInsights.mostViewedProduct} accent="sky" icon={<FiEye />} />
                  <HighlightCard item={productInsights.topCategory} accent="amber" icon={<FiLayers />} />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.85fr]">
                  <PanelCard title="Product Status Breakdown" subtitle="A quick view of how your own product listings are distributed.">
                    {productInsights.statusBreakdown.length === 0 ? (
                      <InlineEmpty text="No product statuses to summarize yet." />
                    ) : (
                      <BreakdownList rows={productInsights.statusBreakdown} total={productInsights.totalListings} />
                    )}
                  </PanelCard>

                  <PanelCard title="Low Engagement Product" subtitle="Helpful for spotting listings that may need updates.">
                    <CompactHighlight item={productInsights.lowEngagementProduct} />
                  </PanelCard>
                </div>

                <PanelCard title="Recent Product Activity" subtitle="Latest listing and order activity tied to your products.">
                  {productInsights.recentActivity.length === 0 ? (
                    <InlineEmpty text="No recent product activity yet." />
                  ) : (
                    <ActivityList items={productInsights.recentActivity} />
                  )}
                </PanelCard>
              </>
            )}
          </InsightsSection>
        )}

        {selectedInsight === 'services' && (
          <InsightsSection
            icon={<FiCalendar className="h-5 w-5" />}
            title="Service Insights"
            description="Performance trends based only on the services you posted and the bookings received for them."
          >
            {serviceInsights.totalListings === 0 ? (
              <EmptyState
                title="No services yet"
                description="Post your first service to start seeing service insights here."
                ctaLabel="Create Service Listing"
                ctaTo="/dashboard/services/new"
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
                  <StatCard title="Total Service Listings" value={serviceInsights.totalListings} icon={<FiCalendar />} tone="sky" />
                  <StatCard title="Active Services" value={serviceInsights.activeListings} icon={<FiCheckCircle />} tone="emerald" />
                  <StatCard title="Total Bookings" value={serviceInsights.totalBookings} icon={<FiActivity />} tone="indigo" />
                  <StatCard title="Completed Bookings" value={serviceInsights.completedBookings} icon={<FiTrendingUp />} tone="teal" />
                  <StatCard title="Pending Bookings" value={serviceInsights.pendingBookings} icon={<FiClock />} tone="amber" />
                  <StatCard title="Cancelled Bookings" value={serviceInsights.cancelledBookings} icon={<FiTrendingDown />} tone="rose" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <StatCard
                    title="Total Service Revenue"
                    value={serviceInsights.totalRevenue !== null ? formatCurrency(serviceInsights.totalRevenue) : 'Not available'}
                    icon={<FiDollarSign />}
                    tone="violet"
                  />
                  <StatCard title="Confirmed Bookings" value={serviceInsights.completedBookings} icon={<FiCheckCircle />} tone="emerald" />
                  <StatCard title="Awaiting Action" value={serviceInsights.pendingBookings} icon={<FiClock />} tone="amber" />
                  <StatCard title="Service Listings With Views" value={services.filter((service) => service.viewsCount > 0).length} icon={<FiEye />} tone="cyan" />
                  <StatCard title="Inactive Services" value={services.filter((service) => service.status !== 'ACTIVE' || service.isActive === false).length} icon={<FiLayers />} tone="slate" />
                </div>

                <div className="mt-10 grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-4">
                  <HighlightCard item={serviceInsights.mostBookedService} accent="emerald" icon={<FiTrendingUp />} />
                  <HighlightCard item={serviceInsights.topPerformingService} accent="indigo" icon={<FiBarChart2 />} />
                  <HighlightCard item={serviceInsights.topCategory} accent="amber" icon={<FiLayers />} />
                  <HighlightCard item={serviceInsights.lowestPerformingService} accent="rose" icon={<FiTrendingDown />} />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.85fr]">
                  <PanelCard title="Booking Status Breakdown" subtitle="How bookings for your own services are moving through the pipeline.">
                    {serviceInsights.bookingBreakdown.length === 0 ? (
                      <InlineEmpty text="No bookings yet." />
                    ) : (
                      <BreakdownList rows={serviceInsights.bookingBreakdown} total={Math.max(serviceInsights.totalBookings, 1)} />
                    )}
                  </PanelCard>

                  <PanelCard title="Service Revenue Note" subtitle="Revenue is calculated only from tracked confirmed booking payments.">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                      {serviceInsights.totalRevenue !== null
                        ? `Tracked confirmed booking revenue: ${formatCurrency(serviceInsights.totalRevenue)}`
                        : 'No confirmed service payment data is available yet.'}
                    </div>
                  </PanelCard>
                </div>

                <PanelCard title="Recent Service Activity" subtitle="Latest updates from your service listings and their bookings.">
                  {serviceInsights.recentActivity.length === 0 ? (
                    <InlineEmpty text="No recent service activity yet." />
                  ) : (
                    <ActivityList items={serviceInsights.recentActivity} />
                  )}
                </PanelCard>
              </>
            )}
          </InsightsSection>
        )}
      </div>
    </div>
  );
};

const InsightsSection: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-card sm:p-7">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          <span className="text-slate-500">{icon}</span>
          {title}
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
      </div>
    </div>

    <div className="mt-6 space-y-6">{children}</div>
  </section>
);

const QuickInfoCard: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <span className="text-slate-400">{icon}</span>
    </div>
    <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

const InsightOverviewCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  badgeLabel: string;
  primaryMetricLabel: string;
  primaryMetricValue: string | number;
  secondaryMetricLabel: string;
  secondaryMetricValue: string | number;
  tertiaryMetricLabel: string;
  tertiaryMetricValue: string | number;
  isActive: boolean;
  onView: () => void;
}> = ({
  title,
  description,
  icon,
  badgeLabel,
  primaryMetricLabel,
  primaryMetricValue,
  secondaryMetricLabel,
  secondaryMetricValue,
  tertiaryMetricLabel,
  tertiaryMetricValue,
  isActive,
  onView,
}) => (
  <div
    className={`rounded-[28px] border p-6 shadow-sm transition-all ${
      isActive
        ? 'border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-sky-50'
        : 'border-slate-200 bg-white hover:border-slate-300'
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          <span className="text-slate-500">{icon}</span>
          {badgeLabel}
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
      <span className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm">{icon}</span>
    </div>

    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <QuickMetric label={primaryMetricLabel} value={primaryMetricValue} />
      <QuickMetric label={secondaryMetricLabel} value={secondaryMetricValue} />
      <QuickMetric label={tertiaryMetricLabel} value={tertiaryMetricValue} />
    </div>

    <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
      <p className="text-sm text-slate-500">
        {isActive ? 'This analytics section is currently open below.' : 'Detailed analytics are hidden until you open this section.'}
      </p>
      <button
        type="button"
        onClick={onView}
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
      >
        View
      </button>
    </div>
  </div>
);

const QuickMetric: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p>
  </div>
);

const statCardToneStyles = {
  sky: 'border-sky-200 bg-gradient-to-br from-sky-50 to-white text-sky-700',
  emerald: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-700',
  amber: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-700',
  indigo: 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-white text-indigo-700',
  rose: 'border-rose-200 bg-gradient-to-br from-rose-50 to-white text-rose-700',
  teal: 'border-teal-200 bg-gradient-to-br from-teal-50 to-white text-teal-700',
  violet: 'border-violet-200 bg-gradient-to-br from-violet-50 to-white text-violet-700',
  cyan: 'border-cyan-200 bg-gradient-to-br from-cyan-50 to-white text-cyan-700',
  slate: 'border-slate-200 bg-gradient-to-br from-slate-50 to-white text-slate-700',
} as const;

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: keyof typeof statCardToneStyles;
}> = ({ title, value, icon, tone = 'slate' }) => (
  <div className={`rounded-2xl border p-4 shadow-sm ${statCardToneStyles[tone]}`}>
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <span className="rounded-xl bg-white/80 p-2 shadow-sm">{icon}</span>
    </div>
    <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
  </div>
);

const accentStyles: Record<string, string> = {
  emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
  indigo: 'border-indigo-200 bg-indigo-50/70 text-indigo-700',
  sky: 'border-sky-200 bg-sky-50/70 text-sky-700',
  amber: 'border-amber-200 bg-amber-50/70 text-amber-700',
  rose: 'border-rose-200 bg-rose-50/70 text-rose-700',
};

const accentCardStyles: Record<
  keyof typeof accentStyles,
  {
    shell: string;
    glow: string;
    pill: string;
    iconWrap: string;
    metricWrap: string;
  }
> = {
  emerald: {
    shell: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white',
    glow: 'from-emerald-200/80 via-emerald-100/40 to-transparent',
    pill: 'bg-emerald-100 text-emerald-700',
    iconWrap: 'border-emerald-200 bg-white text-emerald-600 shadow-emerald-100',
    metricWrap: 'border-emerald-100 bg-emerald-50/70',
  },
  indigo: {
    shell: 'border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-white',
    glow: 'from-indigo-200/80 via-indigo-100/40 to-transparent',
    pill: 'bg-indigo-100 text-indigo-700',
    iconWrap: 'border-indigo-200 bg-white text-indigo-600 shadow-indigo-100',
    metricWrap: 'border-indigo-100 bg-indigo-50/70',
  },
  sky: {
    shell: 'border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-white',
    glow: 'from-sky-200/80 via-sky-100/40 to-transparent',
    pill: 'bg-sky-100 text-sky-700',
    iconWrap: 'border-sky-200 bg-white text-sky-600 shadow-sky-100',
    metricWrap: 'border-sky-100 bg-sky-50/70',
  },
  amber: {
    shell: 'border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white',
    glow: 'from-amber-200/80 via-amber-100/40 to-transparent',
    pill: 'bg-amber-100 text-amber-700',
    iconWrap: 'border-amber-200 bg-white text-amber-600 shadow-amber-100',
    metricWrap: 'border-amber-100 bg-amber-50/70',
  },
  rose: {
    shell: 'border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-white',
    glow: 'from-rose-200/80 via-rose-100/40 to-transparent',
    pill: 'bg-rose-100 text-rose-700',
    iconWrap: 'border-rose-200 bg-white text-rose-600 shadow-rose-100',
    metricWrap: 'border-rose-100 bg-rose-50/70',
  },
};

const HighlightCard: React.FC<{ item: HighlightItem; accent: keyof typeof accentStyles; icon: React.ReactNode }> = ({
  item,
  accent,
  icon,
}) => {
  const style = accentCardStyles[accent];

  return (
    <div className={`group relative overflow-hidden rounded-[26px] border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${style.shell}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${style.glow}`} />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${style.pill}`}>
            {item.label}
          </span>
          {item.title ? (
            <>
              <h3 className="mt-4 text-[1.9rem] font-semibold leading-tight tracking-tight text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-600">{item.subtitle}</p>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">{item.emptyMessage}</p>
          )}
        </div>
        <span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm ${style.iconWrap}`}>
          {icon}
        </span>
      </div>

      <div className="relative mt-5 border-t border-white/70 pt-4">
        <div className={`rounded-2xl border p-4 ${style.metricWrap}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Metric</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{item.metric || item.emptyMessage}</p>
        </div>
      </div>
    </div>
  );
};

const PanelCard: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    <div className="mt-5">{children}</div>
  </div>
);

const CompactHighlight: React.FC<{ item: HighlightItem }> = ({ item }) => {
  if (!item.title) {
    return <InlineEmpty text={item.emptyMessage} />;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
      <p className="mt-2 text-base font-semibold text-slate-900">{item.title}</p>
      <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
      <p className="mt-3 text-sm font-semibold text-slate-800">{item.metric}</p>
    </div>
  );
};

const BreakdownList: React.FC<{ rows: BreakdownRow[]; total: number }> = ({ rows, total }) => (
  <div className="space-y-4">
    {rows.map((row) => {
      const percentage = total > 0 ? Math.round((row.count / total) * 100) : 0;

      return (
        <div key={row.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700">{row.label}</span>
            <span className="text-slate-500">
              {row.count} <span className="text-slate-400">({percentage}%)</span>
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-400"
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

const ActivityList: React.FC<{ items: ActivityItem[] }> = ({ items }) => (
  <div className="space-y-3">
    {items.map((item) => (
      <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{formatDateTime(item.occurredAt)}</p>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{
  title: string;
  description: string;
  ctaLabel: string;
  ctaTo: string;
}> = ({ title, description, ctaLabel, ctaTo }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center">
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{description}</p>
    <Link
      to={ctaTo}
      className="mt-5 inline-flex items-center justify-center rounded-xl border border-primary-200 bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50"
    >
      {ctaLabel}
    </Link>
  </div>
);

const InlineEmpty: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-500">
    {text}
  </div>
);

export default InsightsPage;
