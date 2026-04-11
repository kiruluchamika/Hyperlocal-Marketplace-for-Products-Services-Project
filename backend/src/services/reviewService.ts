import mongoose, { FilterQuery } from "mongoose";
import Review, { IReview } from "../models/Review";
import ServiceSelling from "../models/ServiceSelling";
import ServiceBooking from "../models/ServiceBooking";
import { AppError } from "../utils/AppError";
import { createAdminBroadcast, createUserNotification } from "./notificationService";
import { NotificationType } from "../models/Notification";

const REVIEW_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const REVIEW_COOLDOWN_MS = 3 * 60 * 1000;

const toObjectId = (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid id", 400);
  }
  return new mongoose.Types.ObjectId(id);
};

const computeSpamScore = (content: string) => {
  const normalized = content.toLowerCase();
  let score = 0;

  if (normalized.length < 20) score += 20;
  if (/https?:\/\//.test(normalized)) score += 25;
  if (/(.)\1{5,}/.test(normalized)) score += 20;
  if ((normalized.match(/!/g) || []).length > 4) score += 10;

  return Math.min(score, 100);
};

const recomputeServiceRating = async (serviceId: mongoose.Types.ObjectId) => {
  const stats = await Review.aggregate([
    {
      $match: {
        serviceId,
        status: "PUBLISHED",
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  let total = 0;
  let sum = 0;

  for (const row of stats) {
    const rating = Number(row._id) as 1 | 2 | 3 | 4 | 5;
    const count = Number(row.count || 0);
    if (rating >= 1 && rating <= 5) {
      breakdown[rating] = count;
      total += count;
      sum += rating * count;
    }
  }

  const averageRating = total > 0 ? Number((sum / total).toFixed(1)) : 0;

  await ServiceSelling.findByIdAndUpdate(serviceId, {
    averageRating,
    reviewCount: total,
    ratingBreakdown: breakdown,
  });

  return { averageRating, reviewCount: total, ratingBreakdown: breakdown };
};

const getSortStage = (sortBy?: string): Record<string, 1 | -1> => {
  switch (sortBy) {
    case "oldest":
      return { createdAt: 1 };
    case "ratingHigh":
      return { rating: -1, createdAt: -1 };
    case "ratingLow":
      return { rating: 1, createdAt: -1 };
    case "helpful":
      return { helpfulCount: -1, createdAt: -1 };
    case "latest":
    default:
      return { createdAt: -1 };
  }
};

export const reviewService = {
  async getMyReviewForService(serviceIdInput: string, reviewerId: string) {
    const serviceId = toObjectId(serviceIdInput);

    const review = await Review.findOne({
      serviceId,
      reviewerId: toObjectId(reviewerId),
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    return review;
  },

  async createReview(reviewerId: string, payload: any) {
    const reviewerObjectId = toObjectId(reviewerId);
    const serviceId = toObjectId(payload.serviceId);

    const service = await ServiceSelling.findById(serviceId);
    if (!service) {
      throw new AppError("Service not found", 404);
    }

    const lastReview = await Review.findOne({
      reviewerId: reviewerObjectId,
      serviceId,
    }).sort({ createdAt: -1 });

    if (lastReview && !lastReview.isDeleted) {
      throw new AppError("You already submitted a review for this service", 400);
    }

    if (lastReview && Date.now() - new Date(lastReview.createdAt).getTime() < REVIEW_COOLDOWN_MS) {
      throw new AppError("Please wait before posting another review", 429);
    }

    if (!payload.bookingId) {
      throw new AppError("Only confirmed bookings can be reviewed", 400);
    }

    const bookingId = toObjectId(payload.bookingId);
    const booking = await ServiceBooking.findById(bookingId);

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    if (String(booking.buyerId) !== reviewerId) {
      throw new AppError("You can only review your own booking", 403);
    }

    if (String(booking.serviceId) !== String(serviceId)) {
      throw new AppError("Booking does not match this service", 400);
    }

    if (booking.status !== "CONFIRMED") {
      throw new AppError("Only confirmed bookings can be reviewed", 400);
    }

    const existingBookingReview = await Review.findOne({
      bookingId,
      reviewerId: reviewerObjectId,
      isDeleted: false,
    });

    if (existingBookingReview) {
      throw new AppError("You already reviewed this booking", 400);
    }

    const spamScore = computeSpamScore(payload.content);
    const shouldFlagAdmin = spamScore >= 40;

    const review = await Review.create({
      serviceId,
      sellerId: service.sellerId,
      reviewerId: reviewerObjectId,
      bookingId,
      source: "BOOKING",
      rating: payload.rating,
      title: payload.title,
      content: payload.content,
      status: "PUBLISHED",
      trustScore: 80,
      spamScore,
      helpfulCount: 0,
      helpfulVoterIds: [],
    });

    await recomputeServiceRating(serviceId);

    await createUserNotification(service.sellerId, {
      title: "New service review",
      message: `You received a ${payload.rating}-star review on \"${service.title}\".`,
      type: NotificationType.REVIEW,
      entityType: "Review",
      entityId: String(review._id),
    });

    if (shouldFlagAdmin) {
      await createAdminBroadcast({
        title: "Review flagged by spam score",
        message: `Review ${String(review._id).slice(-6)} crossed spam threshold and should be checked.`,
        type: NotificationType.REVIEW,
        entityType: "Review",
        entityId: String(review._id),
      });
    }

    return review;
  },

  async listServiceReviews(serviceIdInput: string, query: any) {
    const serviceId = toObjectId(serviceIdInput);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IReview> = {
      serviceId,
      status: "PUBLISHED",
      isDeleted: false,
    };

    if (query.rating) {
      filter.rating = Number(query.rating);
    }

    const [items, total] = await Promise.all([
      Review.find(filter)
        .sort(getSortStage(query.sortBy))
        .skip(skip)
        .limit(limit)
        .populate("reviewerId", "name profileImage")
        .lean(),
      Review.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getServiceReviewSummary(serviceIdInput: string) {
    const serviceId = toObjectId(serviceIdInput);
    const service = await ServiceSelling.findById(serviceId).select("averageRating reviewCount ratingBreakdown").lean();

    if (!service) {
      throw new AppError("Service not found", 404);
    }

    return {
      averageRating: service.averageRating || 0,
      reviewCount: service.reviewCount || 0,
      ratingBreakdown: service.ratingBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  },

  async updateReview(reviewIdInput: string, reviewerId: string, payload: any) {
    const reviewId = toObjectId(reviewIdInput);
    const review = await Review.findById(reviewId);

    if (!review || review.isDeleted) {
      throw new AppError("Review not found", 404);
    }

    if (String(review.reviewerId) !== reviewerId) {
      throw new AppError("Forbidden", 403);
    }

    if (Date.now() - new Date(review.createdAt).getTime() > REVIEW_EDIT_WINDOW_MS) {
      throw new AppError("Review edit window has expired", 400);
    }

    if (payload.rating !== undefined) review.rating = payload.rating;
    if (payload.title !== undefined) review.title = payload.title;
    if (payload.content !== undefined) {
      review.content = payload.content;
      review.spamScore = computeSpamScore(payload.content);
    }

    review.editedAt = new Date();
    await review.save();

    await recomputeServiceRating(review.serviceId as any);

    return review;
  },

  async deleteReview(reviewIdInput: string, actorId: string, isAdmin: boolean) {
    const reviewId = toObjectId(reviewIdInput);
    const review = await Review.findById(reviewId);

    if (!review || review.isDeleted) {
      throw new AppError("Review not found", 404);
    }

    if (!isAdmin && String(review.reviewerId) !== actorId) {
      throw new AppError("Forbidden", 403);
    }

    if (!isAdmin && Date.now() - new Date(review.createdAt).getTime() > REVIEW_EDIT_WINDOW_MS) {
      throw new AppError("Review delete window has expired", 400);
    }

    review.isDeleted = true;
    review.deletedAt = new Date();
    review.status = "HIDDEN";
    await review.save();

    await recomputeServiceRating(review.serviceId as any);

    return { message: "Review deleted successfully" };
  },

  async replyToReview(reviewIdInput: string, sellerId: string, content: string) {
    const reviewId = toObjectId(reviewIdInput);
    const review = await Review.findById(reviewId);

    if (!review || review.isDeleted) {
      throw new AppError("Review not found", 404);
    }

    if (review.status !== "PUBLISHED") {
      throw new AppError("Cannot reply to a hidden review", 400);
    }

    if (String(review.sellerId) !== sellerId) {
      throw new AppError("Only the service seller can reply", 403);
    }

    review.sellerResponse = {
      content,
      respondedAt: new Date(),
    };

    await review.save();

    await createUserNotification(String(review.reviewerId), {
      title: "Seller replied to your review",
      message: "A seller has replied to your service review.",
      type: NotificationType.REVIEW,
      entityType: "Review",
      entityId: String(review._id),
    });

    return review;
  },

  async listReviewsForAdmin(query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IReview> = {
      isDeleted: false,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.serviceId && mongoose.Types.ObjectId.isValid(query.serviceId)) {
      filter.serviceId = toObjectId(query.serviceId);
    }

    if (query.search) {
      filter.$or = [
        { content: { $regex: query.search, $options: "i" } },
        { title: { $regex: query.search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reviewerId", "name email")
        .populate("sellerId", "name email")
        .populate("serviceId", "title")
        .lean(),
      Review.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async moderateReview(reviewIdInput: string, adminId: string, action: "HIDE" | "RESTORE", reason?: string) {
    const reviewId = toObjectId(reviewIdInput);
    const review = await Review.findById(reviewId);

    if (!review || review.isDeleted) {
      throw new AppError("Review not found", 404);
    }

    if (action === "HIDE") {
      review.status = "HIDDEN";
      review.hiddenReason = reason || "Hidden by admin";
      review.hiddenBy = new mongoose.Types.ObjectId(adminId);
      review.hiddenAt = new Date();
    } else {
      review.status = "PUBLISHED";
      review.hiddenReason = undefined;
      review.hiddenBy = undefined;
      review.hiddenAt = undefined;
    }

    await review.save();
    await recomputeServiceRating(review.serviceId as any);

    await createUserNotification(String(review.reviewerId), {
      title: action === "HIDE" ? "Your review was hidden" : "Your review is visible again",
      message: action === "HIDE" ? "An admin has hidden your review after moderation." : "An admin restored your review.",
      type: NotificationType.REVIEW,
      entityType: "Review",
      entityId: String(review._id),
    });

    return review;
  },

  async voteReviewHelpful(reviewIdInput: string, userId: string) {
    const reviewId = toObjectId(reviewIdInput);
    const voterId = toObjectId(userId);
    const review = await Review.findById(reviewId);

    if (!review || review.isDeleted || review.status !== "PUBLISHED") {
      throw new AppError("Review not found", 404);
    }

    if (String(review.reviewerId) === userId) {
      throw new AppError("You cannot vote on your own review", 400);
    }

    const existingIndex = review.helpfulVoterIds.findIndex(
      (id) => String(id) === String(voterId)
    );

    let voted = false;

    if (existingIndex >= 0) {
      review.helpfulVoterIds.splice(existingIndex, 1);
      voted = false;
    } else {
      review.helpfulVoterIds.push(voterId);
      voted = true;
    }

    review.helpfulCount = review.helpfulVoterIds.length;
    await review.save();

    return {
      reviewId: String(review._id),
      helpfulCount: review.helpfulCount,
      voted,
    };
  },
};
