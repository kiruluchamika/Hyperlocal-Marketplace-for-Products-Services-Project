/* ───────── Admin Dashboard Types ───────── */

export interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalServices: number;
  totalOrders: number;
  totalBookings: number;
  totalCategories: number;
  totalRevenue: number;
  totalReviews: number;
  hiddenReviewRatio: number;
  averageServiceRating: number;
}

export interface ChartDataPoint {
  month: string;
  count?: number;
  revenue?: number;
}

export interface ChartData {
  revenueByMonth: { month: string; revenue: number }[];
  ordersByMonth: { month: string; count: number }[];
  listingsByMonth: { month: string; count: number }[];
  reviewsByMonth: { month: string; avgRating: number; count: number }[];
}

export interface DashboardData {
  stats: AdminStats;
  ordersByStatus: Record<string, number>;
  userGrowth: { month: string; count: number }[];
  performance: {
    topSellingProduct: {
      name: string;
      orderCount: number;
      revenue: number;
    } | null;
    mostActiveUser: {
      name: string;
      activityCount: number;
      activityLabel: string;
    } | null;
    topCategory: {
      name: string;
      listingCount: number;
    } | null;
  };
  recentUsers: {
    _id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    profileImage?: string;
  }[];
  recentOrders: {
    _id: string;
    titleSnapshot: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    buyerId: { _id: string; name: string; email: string };
    sellerId: { _id: string; name: string; email: string };
  }[];
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  age: number;
  isActive: boolean;
  suspendedAt?: string;
  isProfileComplete: boolean;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrder {
  _id: string;
  buyerId: { _id: string; name: string; email: string };
  sellerId: { _id: string; name: string; email: string };
  titleSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  totalAmount: number;
  deliveryMethod: string;
  status: string;
  createdAt: string;
}

export interface AdminPayment {
  _id: string;
  orderId: { _id: string; titleSnapshot: string; totalAmount: number; status: string };
  buyerId: { _id: string; name: string; email: string };
  sellerId: { _id: string; name: string; email: string };
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: {
    payoutStatus?: string;
    stripeTransferId?: string;
    payoutError?: string;
    payoutAttemptedAt?: string;
    payoutGrossAmount?: number;
    payoutFeePercent?: number;
    payoutFeeAmount?: number;
    payoutNetAmount?: number;
  };
  createdAt: string;
}

export interface AdminBooking {
  _id: string;
  serviceId: { _id: string; title: string; price: number };
  buyerId: { _id: string; name: string; email: string };
  providerId: { _id: string; name: string; email: string };
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: string;
  deposit?: {
    amount?: number;
    currency?: string;
    stripeTransferId?: string;
    payoutStatus?: string;
    payoutError?: string;
    payoutAttemptedAt?: string;
    payoutGrossAmount?: number;
    payoutFeePercent?: number;
    payoutFeeAmount?: number;
    payoutNetAmount?: number;
  };
  note?: string;
  createdAt: string;
}

export interface AdminListing {
  _id: string;
  ownerId: { _id: string; name: string; email: string };
  categoryId: { _id: string; name: string };
  title: string;
  price: number;
  currency: string;
  condition: string;
  status: string;
  images: string[];
  viewsCount: number;
  createdAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  totalPages: number;
}

export interface WalletBalanceItem {
  currency: string;
  amount: number;
}

export interface AdminMarketplaceWallet {
  available: WalletBalanceItem[];
  pending: WalletBalanceItem[];
  instantAvailable: WalletBalanceItem[];
}

export interface AdminAppSettings {
  paymentsEnabled: boolean;
  paymentsDisabledMessage: string;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  maintenanceGraceSeconds: number;
  updatedAt: string;
  updatedBy?: string;
}

export interface AdminAppSettingsUpdatePayload {
  paymentsEnabled?: boolean;
  paymentsDisabledMessage?: string;
  maintenanceEnabled?: boolean;
  maintenanceMessage?: string;
  maintenanceGraceSeconds?: number;
}
