import User from "../models/User";
import ProductListing from "../models/ProductListing";
import ServiceSelling from "../models/ServiceSelling";
import ServiceBooking from "../models/ServiceBooking";
import Order from "../models/Order";
import Payment from "../models/Payment";
import Category from "../models/Category";
import { createUserNotification } from "./notificationService";
import { getEmail, sendEmail } from "./emailNotifications";
import { AppError } from "../utils/AppError";

/* ───────── Dashboard Stats ───────── */
export const getDashboardStats = async () => {
  const [
    totalUsers,
    totalProducts,
    totalServices,
    totalOrders,
    totalBookings,
    totalCategories,
    recentUsers,
    recentOrders,
  ] = await Promise.all([
    User.countDocuments(),
    ProductListing.countDocuments({ status: { $ne: "DELETED" } }),
    ServiceSelling.countDocuments({ status: { $ne: "DELETED" } }),
    Order.countDocuments({ isDeleted: false }),
    ServiceBooking.countDocuments(),
    Category.countDocuments(),
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

  return {
    stats: {
      totalUsers,
      totalProducts,
      totalServices,
      totalOrders,
      totalBookings,
      totalCategories,
      totalRevenue,
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
  };
};

/* ───────── Chart Data ───────── */
export const getChartData = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [revenueByMonth, ordersByMonth, listingsByMonth] = await Promise.all([
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
  ]);

  const formatMonth = (g: { _id: { year: number; month: number } }) =>
    `${g._id.year}-${String(g._id.month).padStart(2, "0")}`;

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

  return {
    payments,
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

  return {
    bookings,
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
    await sendEmail(email, "Listing Restored - Bazaaro", `<p>Good news! Your listing <b>${listing.title}</b> has been approved and is back active on the marketplace.</p>`);
  } catch (e) {}

  return listing;
};
