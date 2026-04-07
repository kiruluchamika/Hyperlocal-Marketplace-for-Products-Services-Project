import User from "../models/User";
import ProductListing from "../models/ProductListing";
import ServiceSelling from "../models/ServiceSelling";
import ServiceBooking from "../models/ServiceBooking";
import Order from "../models/Order";
import Payment from "../models/Payment";
import Category from "../models/Category";
import Review from "../models/Review";
import WebsiteReview from "../models/WebsiteReview";
import Stripe from "stripe";
import { env } from "../config/env";
import { createUserNotification } from "./notificationService";
import { getEmail, sendEmail } from "./emailNotifications";
import { AppError } from "../utils/AppError";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia" as any,
});

const deriveProductPayoutStatus = (payment: { status?: string; metadata?: Record<string, any> }) => {
  const metadataStatus = payment.metadata?.payoutStatus;
  if (typeof metadataStatus === "string" && metadataStatus.length > 0) {
    return metadataStatus;
  }

  switch (payment.status) {
    case "RELEASED":
      return "PAID_OUT";
    case "HELD":
    case "INITIATED":
      return "PENDING";
    case "REFUNDED":
      return "REVERSED";
    case "FAILED":
      return "FAILED";
    default:
      return undefined;
  }
};

const deriveProductPayoutMetadata = (payment: any) => {
  const metadata = payment.metadata || {};
  const grossAmount = typeof metadata.payoutGrossAmount === "number" ? metadata.payoutGrossAmount : payment.amount;
  const feePercent =
    typeof metadata.payoutFeePercent === "number" ? metadata.payoutFeePercent : env.STRIPE_TRANSFER_FEE_PERCENT;
  const feeAmount =
    typeof metadata.payoutFeeAmount === "number"
      ? metadata.payoutFeeAmount
      : typeof feePercent === "number"
        ? Math.round(grossAmount * (feePercent / 100) * 100) / 100
        : undefined;
  const netAmount =
    typeof metadata.payoutNetAmount === "number"
      ? metadata.payoutNetAmount
      : typeof feeAmount === "number"
        ? Math.max(0, grossAmount - feeAmount)
        : undefined;

  return {
    ...metadata,
    payoutStatus: deriveProductPayoutStatus(payment),
    payoutTransferId: metadata.stripeTransferId,
    payoutAttemptedAt:
      typeof metadata.payoutAttemptedAt === "string"
        ? metadata.payoutAttemptedAt
        : payment.status === "RELEASED"
          ? payment.updatedAt?.toISOString?.() ?? payment.createdAt?.toISOString?.()
          : metadata.payoutAttemptedAt,
    payoutGrossAmount: grossAmount,
    payoutFeePercent: feePercent,
    payoutFeeAmount: feeAmount,
    payoutNetAmount: netAmount,
  };
};

const deriveServicePayoutStatus = (booking: { status?: string; deposit?: Record<string, any> }) => {
  const depositStatus = booking.deposit?.payoutStatus;
  if (typeof depositStatus === "string" && depositStatus.length > 0) {
    return depositStatus;
  }

  switch (booking.status) {
    case "CONFIRMED":
      return "PAID_OUT";
    case "PROVIDER_ACCEPTED":
      return "AVAILABLE";
    case "PENDING":
      return "PENDING";
    case "REJECTED":
    case "CANCELLED":
      return "REVERSED";
    default:
      return undefined;
  }
};

const deriveServicePayoutMetadata = (booking: any) => {
  const deposit = booking.deposit || {};
  const grossAmount = typeof deposit.payoutGrossAmount === "number" ? deposit.payoutGrossAmount : deposit.amount;
  const feePercent =
    typeof deposit.payoutFeePercent === "number" ? deposit.payoutFeePercent : env.STRIPE_TRANSFER_FEE_PERCENT;
  const feeAmount =
    typeof deposit.payoutFeeAmount === "number"
      ? deposit.payoutFeeAmount
      : typeof feePercent === "number"
        ? Math.round(grossAmount * (feePercent / 100) * 100) / 100
        : undefined;
  const netAmount =
    typeof deposit.payoutNetAmount === "number"
      ? deposit.payoutNetAmount
      : typeof feeAmount === "number"
        ? Math.max(0, grossAmount - feeAmount)
        : undefined;

  return {
    ...deposit,
    payoutStatus: deriveServicePayoutStatus(booking),
    payoutTransferId: deposit.stripeTransferId,
    payoutAttemptedAt:
      typeof deposit.payoutAttemptedAt === "string"
        ? deposit.payoutAttemptedAt
        : booking.status === "CONFIRMED"
          ? booking.updatedAt?.toISOString?.() ?? booking.createdAt?.toISOString?.()
          : deposit.payoutAttemptedAt,
    payoutGrossAmount: grossAmount,
    payoutFeePercent: feePercent,
    payoutFeeAmount: feeAmount,
    payoutNetAmount: netAmount,
  };
};

/* ───────── Dashboard Stats ───────── */
export const getDashboardStats = async () => {
  const [
    totalUsers,
    totalProducts,
    totalServices,
    totalOrders,
    totalBookings,
    totalCategories,
    totalReviews,
    totalWebsiteReviews,
    hiddenReviews,
    hiddenWebsiteReviews,
    averageRatingAgg,
    averageWebsiteRatingAgg,
    recentUsers,
    recentOrders,
  ] = await Promise.all([
    User.countDocuments(),
    ProductListing.countDocuments({ status: { $ne: "DELETED" } }),
    ServiceSelling.countDocuments({ status: { $ne: "DELETED" } }),
    Order.countDocuments({ isDeleted: false }),
    ServiceBooking.countDocuments(),
    Category.countDocuments(),
    Review.countDocuments({ isDeleted: false }),
    WebsiteReview.countDocuments({ isDeleted: false }),
    Review.countDocuments({ isDeleted: false, status: "HIDDEN" }),
    WebsiteReview.countDocuments({ isDeleted: false, status: "HIDDEN" }),
    Review.aggregate([
      { $match: { isDeleted: false, status: "PUBLISHED" } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]),
    WebsiteReview.aggregate([
      { $match: { isDeleted: false, status: "PUBLISHED" } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]),
    User.find().sort({ createdAt: -1 }).limit(5).select("name email role createdAt profileImage"),
    Order.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("buyerId", "name email")
      .populate("sellerId", "name email"),
  ]);

  // Revenue (sum of RELEASED + HELD payments)
  const revenueAgg = await Payment.aggregate([
    { $match: { status: { $in: ["RELEASED", "HELD"] } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalRevenue = revenueAgg[0]?.total ?? 0;

  // Order status breakdown
  const ordersByStatus = await Order.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  // User growth (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const userGrowth = await User.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  // Merged review stats from both Review and WebsiteReview
  const mergedReviewCount = totalReviews + totalWebsiteReviews;
  const mergedHiddenReviews = hiddenReviews + hiddenWebsiteReviews;
  const mergedWeightedRating =
    (Number(averageRatingAgg[0]?.avgRating || 0) * totalReviews +
      Number(averageWebsiteRatingAgg[0]?.avgRating || 0) * totalWebsiteReviews) /
    (mergedReviewCount || 1);
  const averageServiceRating = Number((mergedWeightedRating || 0).toFixed(1));
  const hiddenReviewRatio =
    mergedReviewCount > 0 ? Number(((mergedHiddenReviews / mergedReviewCount) * 100).toFixed(1)) : 0;

  // Performance analytics from dev branch
  const topSellingProductAgg = await Order.aggregate([
    { $match: { isDeleted: false, status: "COMPLETED" } },
    {
      $group: {
        _id: "$listingId",
        name: { $first: "$titleSnapshot" },
        orderCount: { $sum: 1 },
        revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
      },
    },
    { $sort: { orderCount: -1, revenue: -1, name: 1 } },
    { $limit: 1 },
  ]);

  const mostActiveUserByOrdersAgg = await Order.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: "$buyerId",
        activityCount: { $sum: 1 },
      },
    },
    { $sort: { activityCount: -1, _id: 1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        name: "$user.name",
        activityCount: 1,
      },
    },
  ]);

  const [productListingActivityAgg, serviceListingActivityAgg, productCategoryAgg, serviceCategoryAgg] =
    await Promise.all([
      ProductListing.aggregate([
        { $match: { status: { $ne: "DELETED" } } },
        {
          $group: {
            _id: "$ownerId",
            activityCount: { $sum: 1 },
          },
        },
      ]),
      ServiceSelling.aggregate([
        { $match: { status: { $ne: "DELETED" } } },
        {
          $group: {
            _id: "$sellerId",
            activityCount: { $sum: 1 },
          },
        },
      ]),
      ProductListing.aggregate([
        { $match: { status: { $ne: "DELETED" } } },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        {
          $group: {
            _id: "$category._id",
            name: { $first: "$category.name" },
            listingCount: { $sum: 1 },
          },
        },
      ]),
      ServiceSelling.aggregate([
        { $match: { status: { $ne: "DELETED" } } },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        {
          $group: {
            _id: "$category._id",
            name: { $first: "$category.name" },
            listingCount: { $sum: 1 },
          },
        },
      ]),
    ]);

  const topSellingProduct = topSellingProductAgg[0]
    ? {
        name: topSellingProductAgg[0].name,
        orderCount: topSellingProductAgg[0].orderCount,
        revenue: topSellingProductAgg[0].revenue,
      }
    : null;

  const listingActivityByUser = new Map<string, number>();
  [...productListingActivityAgg, ...serviceListingActivityAgg].forEach((entry) => {
    const userId = String(entry._id);
    listingActivityByUser.set(userId, (listingActivityByUser.get(userId) ?? 0) + (entry.activityCount ?? 0));
  });

  let mostActiveUser = mostActiveUserByOrdersAgg[0]
    ? {
        name: mostActiveUserByOrdersAgg[0].name,
        activityCount: mostActiveUserByOrdersAgg[0].activityCount,
        activityLabel: "orders",
      }
    : null;

  if (!mostActiveUser && listingActivityByUser.size > 0) {
    const [topUserId, activityCount] = Array.from(listingActivityByUser.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })[0];

    const user = await User.findById(topUserId).select("name");
    if (user?.name) {
      mostActiveUser = {
        name: user.name,
        activityCount,
        activityLabel: "actions",
      };
    }
  }

  const categoryCounts = new Map<string, { name: string; listingCount: number }>();
  [...productCategoryAgg, ...serviceCategoryAgg].forEach((entry) => {
    const categoryId = String(entry._id);
    const existing = categoryCounts.get(categoryId) ?? { name: entry.name, listingCount: 0 };
    existing.listingCount += entry.listingCount ?? 0;
    categoryCounts.set(categoryId, existing);
  });

  const topCategory =
    Array.from(categoryCounts.values()).sort((a, b) => {
      if (b.listingCount !== a.listingCount) return b.listingCount - a.listingCount;
      return a.name.localeCompare(b.name);
    })[0] ?? null;

  return {
    stats: {
      totalUsers,
      totalProducts,
      totalServices,
      totalOrders,
      totalBookings,
      totalCategories,
      totalRevenue,
      totalReviews: mergedReviewCount,
      hiddenReviewRatio,
      averageServiceRating,
    },
    ordersByStatus: ordersByStatus.reduce(
      (acc, cur) => ({ ...acc, [cur._id]: cur.count }),
      {} as Record<string, number>
    ),
    userGrowth: userGrowth.map((g) => ({
      month: `${g._id.year}-${String(g._id.month).padStart(2, "0")}`,
      count: g.count,
    })),
    recentUsers,
    recentOrders,
    performance: {
      topSellingProduct,
      mostActiveUser,
      topCategory,
    },
  };
};

/* ───────── Chart Data ───────── */
export const getChartData = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [revenueByMonth, ordersByMonth, listingsByMonth, reviewsByMonth, websiteReviewsByMonth] = await Promise.all([
    // Monthly revenue
    Payment.aggregate([
      {
        $match: {
          status: { $in: ["RELEASED", "HELD"] },
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    // Monthly orders
    Order.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    // Monthly new listings
    ProductListing.aggregate([
      {
        $match: {
          status: { $ne: "DELETED" },
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Review.aggregate([
      {
        $match: {
          status: "PUBLISHED",
          isDeleted: false,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    WebsiteReview.aggregate([
      {
        $match: {
          status: "PUBLISHED",
          isDeleted: false,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  const formatMonth = (g: { _id: { year: number; month: number } }) =>
    `${g._id.year}-${String(g._id.month).padStart(2, "0")}`;

  const reviewsMap = new Map<string, { totalRating: number; count: number }>();

  for (const row of reviewsByMonth) {
    const month = formatMonth(row);
    reviewsMap.set(month, {
      totalRating: Number(row.avgRating || 0) * Number(row.count || 0),
      count: Number(row.count || 0),
    });
  }

  for (const row of websiteReviewsByMonth) {
    const month = formatMonth(row);
    const existing = reviewsMap.get(month);
    const addTotalRating = Number(row.avgRating || 0) * Number(row.count || 0);
    const addCount = Number(row.count || 0);

    if (existing) {
      reviewsMap.set(month, {
        totalRating: existing.totalRating + addTotalRating,
        count: existing.count + addCount,
      });
    } else {
      reviewsMap.set(month, {
        totalRating: addTotalRating,
        count: addCount,
      });
    }
  }

  const mergedReviewsByMonth = Array.from(reviewsMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      month,
      avgRating: Number(((value.totalRating || 0) / (value.count || 1)).toFixed(2)),
      count: value.count,
    }));

  return {
    revenueByMonth: revenueByMonth.map((g) => ({
      month: formatMonth(g),
      revenue: g.revenue,
    })),
    ordersByMonth: ordersByMonth.map((g) => ({
      month: formatMonth(g),
      count: g.count,
    })),
    listingsByMonth: listingsByMonth.map((g) => ({
      month: formatMonth(g),
      count: g.count,
    })),
    reviewsByMonth: mergedReviewsByMonth,
  };
};

/* ───────── All Users (admin) ───────── */
export const getAllUsersAdmin = async (query: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.status === "active") filter.isActive = { $ne: false };
  if (query.status === "suspended") filter.isActive = false;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: { total, page, totalPages: Math.ceil(total / limit) },
  };
};

/* ───────── Toggle user status ───────── */
export const updateUserStatus = async (
  userId: string,
  action: "suspend" | "activate"
) => {
  const update =
    action === "suspend"
      ? { isActive: false, suspendedAt: new Date() }
      : { isActive: true, $unset: { suspendedAt: 1 } };

  const user = await User.findByIdAndUpdate(userId, update, { new: true });
  return user;
};

/* ───────── All Payments (admin) ───────── */
export const getAllPayments = async (query: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("buyerId", "name email")
      .populate("sellerId", "name email")
      .populate("orderId", "titleSnapshot totalAmount status"),
    Payment.countDocuments(filter),
  ]);

  const enrichedPayments = payments.map((payment) => {
    const plainPayment = payment.toObject();
    return {
      ...plainPayment,
      metadata: deriveProductPayoutMetadata(plainPayment),
    };
  });

  return {
    payments: enrichedPayments,
    pagination: { total, page, totalPages: Math.ceil(total / limit) },
  };
};

/* ───────── All Bookings (admin) ───────── */
export const getAllBookings = async (query: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  const [bookings, total] = await Promise.all([
    ServiceBooking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("buyerId", "name email")
      .populate("providerId", "name email")
      .populate("serviceId", "title price"),
    ServiceBooking.countDocuments(filter),
  ]);

  const enrichedBookings = bookings.map((booking) => {
    const plainBooking = booking.toObject();
    return {
      ...plainBooking,
      deposit: deriveServicePayoutMetadata(plainBooking),
    };
  });

  return {
    bookings: enrichedBookings,
    pagination: { total, page, totalPages: Math.ceil(total / limit) },
  };
};

/* ───────── All Orders (admin) ───────── */
export const getAllOrdersAdmin = async (query: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { isDeleted: false };
  if (query.status) filter.status = query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("buyerId", "name email")
      .populate("sellerId", "name email"),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: { total, page, totalPages: Math.ceil(total / limit) },
  };
};

/* ───────── All Product Listings (admin) ───────── */
export const getAllListingsAdmin = async (query: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.title = { $regex: query.search, $options: "i" };
  }

  const [listings, total] = await Promise.all([
    ProductListing.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("ownerId", "name email")
      .populate("categoryId", "name"),
    ProductListing.countDocuments(filter),
  ]);

  return {
    listings,
    pagination: { total, page, totalPages: Math.ceil(total / limit) },
  };
};

/* ───────── Suspend Listing (admin) ───────── */
export const suspendListing = async (listingId: string, reason: string) => {
  const listing = await ProductListing.findById(listingId);
  if (!listing) throw new AppError("Listing not found", 404);

  listing.status = "SUSPENDED";
  listing.suspendReason = reason;

  const deadline = new Date();
  deadline.setHours(deadline.getHours() + 3);
  listing.suspendDeadline = deadline;

  await listing.save();

  await createUserNotification(listing.ownerId.toString(), {
    title: "Listing Suspended",
    message: `Your listing "${listing.title}" has been suspended. Reason: ${reason}. You have 3 hours to edit and appeal before it is permanently deleted.`,
    type: "SYSTEM" as any,
  });

  try {
    const email = await getEmail(listing.ownerId.toString());
    await sendEmail(
      email,
      "Urgent: Action Required - Listing Suspended",
      `<p>Your listing <b>${listing.title}</b> has been suspended from Bazaaro.</p>
       <p><b>Reason:</b> ${reason}</p>
       <p>You have 3 hours to edit the listing to resolve this issue. If not resolved, it will be automatically deleted on ${deadline.toLocaleString()}.</p>
       <p>Please log in to your dashboard to appeal.</p>`
    );
  } catch (e) {
    console.error("Failed to send suspension email:", e);
  }

  return listing;
};

/* ───────── Approve Listing (admin) ───────── */
export const approveListing = async (listingId: string) => {
  const listing = await ProductListing.findById(listingId);
  if (!listing) throw new AppError("Listing not found", 404);

  listing.status = "ACTIVE";
  listing.suspendReason = undefined;
  listing.suspendDeadline = undefined;

  await listing.save();

  await createUserNotification(listing.ownerId.toString(), {
    title: "Listing Approved",
    message: `Your listing "${listing.title}" has been reviewed and restored.`,
    type: "SYSTEM" as any,
  });

  try {
    const email = await getEmail(listing.ownerId.toString());
    await sendEmail(
      email,
      "Listing Restored - Bazaaro",
      `<p>Good news! Your listing <b>${listing.title}</b> has been approved and is back active on the marketplace.</p>`
    );
  } catch (e) {}

  return listing;
};

/* ───────── Marketplace Wallet (admin) ───────── */
export const getMarketplaceWallet = async () => {
  try {
    const balance = await stripe.balance.retrieve();
    const displayCurrency = env.CURRENCY.toUpperCase();
    const balanceToLkrRate = env.STRIPE_BALANCE_TO_LKR_RATE;

    const mapEntries = (entries: Array<{ currency: string; amount: number }>) =>
      (entries || []).map((entry) => ({
        currency: displayCurrency,
        amount:
          (entry.amount / 100) *
          (String(entry.currency || "").toUpperCase() === displayCurrency ? 1 : balanceToLkrRate),
      }));

    return {
      available: mapEntries(balance.available || []),
      pending: mapEntries(balance.pending || []),
      instantAvailable: mapEntries(balance.instant_available || []),
    };
  } catch (error: any) {
    const message = String(error?.message || error?.raw?.message || "");
    throw new AppError(message || "Unable to fetch marketplace wallet balance", 400);
  }
};