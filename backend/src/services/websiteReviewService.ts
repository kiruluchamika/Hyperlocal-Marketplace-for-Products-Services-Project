import mongoose, { FilterQuery } from "mongoose";
import { AppError } from "../utils/AppError";
import WebsiteReview, { IWebsiteReview } from "../models/WebsiteReview";

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 3 * 60 * 1000;

const toObjectId = (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid id", 400);
  }

  return new mongoose.Types.ObjectId(id);
};

const getSort = (sortBy?: string): Record<string, 1 | -1> => {
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

export const websiteReviewService = {
  async create(userId: string, payload: any) {
    const reviewerId = toObjectId(userId);

    const last = await WebsiteReview.findOne({ reviewerId }).sort({ createdAt: -1 });

    if (last && !last.isDeleted) {
      throw new AppError("You already submitted a website review", 400);
    }

    if (last && Date.now() - new Date(last.createdAt).getTime() < COOLDOWN_MS) {
      throw new AppError("Please wait before posting another review", 429);
    }

    return WebsiteReview.create({
      reviewerId,
      rating: payload.rating,
      title: payload.title,
      content: payload.content,
      status: "PUBLISHED",
      helpfulCount: 0,
      helpfulVoterIds: [],
    });
  },

  async list(query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IWebsiteReview> = {
      status: "PUBLISHED",
      isDeleted: false,
    };

    if (query.rating) {
      filter.rating = Number(query.rating);
    }

    const [items, total] = await Promise.all([
      WebsiteReview.find(filter)
        .sort(getSort(query.sortBy))
        .skip(skip)
        .limit(limit)
        .populate("reviewerId", "name profileImage")
        .lean(),
      WebsiteReview.countDocuments(filter),
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

  async summary() {
    const stats = await WebsiteReview.aggregate([
      { $match: { status: "PUBLISHED", isDeleted: false } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
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

    return {
      averageRating: total > 0 ? Number((sum / total).toFixed(1)) : 0,
      reviewCount: total,
      ratingBreakdown: breakdown,
    };
  },

  async getMine(userId: string) {
    return WebsiteReview.findOne({
      reviewerId: toObjectId(userId),
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();
  },

  async update(id: string, userId: string, payload: any) {
    const review = await WebsiteReview.findById(toObjectId(id));
    if (!review || review.isDeleted) {
      throw new AppError("Review not found", 404);
    }

    if (String(review.reviewerId) !== userId) {
      throw new AppError("Forbidden", 403);
    }

    if (Date.now() - new Date(review.createdAt).getTime() > EDIT_WINDOW_MS) {
      throw new AppError("Review edit window has expired", 400);
    }

    if (payload.rating !== undefined) review.rating = payload.rating;
    if (payload.title !== undefined) review.title = payload.title;
    if (payload.content !== undefined) review.content = payload.content;
    review.editedAt = new Date();

    await review.save();
    return review;
  },

  async remove(id: string, actorId: string, isAdmin: boolean) {
    const review = await WebsiteReview.findById(toObjectId(id));
    if (!review || review.isDeleted) {
      throw new AppError("Review not found", 404);
    }

    if (!isAdmin && String(review.reviewerId) !== actorId) {
      throw new AppError("Forbidden", 403);
    }

    if (!isAdmin && Date.now() - new Date(review.createdAt).getTime() > EDIT_WINDOW_MS) {
      throw new AppError("Review delete window has expired", 400);
    }

    review.isDeleted = true;
    review.deletedAt = new Date();
    review.status = "HIDDEN";
    await review.save();

    return { message: "Website review deleted successfully" };
  },

  async voteHelpful(id: string, userId: string) {
    const review = await WebsiteReview.findById(toObjectId(id));
    if (!review || review.isDeleted || review.status !== "PUBLISHED") {
      throw new AppError("Review not found", 404);
    }

    if (String(review.reviewerId) === userId) {
      throw new AppError("You cannot vote on your own review", 400);
    }

    const voterId = toObjectId(userId);
    const index = review.helpfulVoterIds.findIndex((entry) => String(entry) === String(voterId));
    let voted = false;

    if (index >= 0) {
      review.helpfulVoterIds.splice(index, 1);
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

  async listAdmin(query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IWebsiteReview> = {
      isDeleted: false,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: "i" } },
        { content: { $regex: query.search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      WebsiteReview.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reviewerId", "name email")
        .lean(),
      WebsiteReview.countDocuments(filter),
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

  async moderate(id: string, adminId: string, action: "HIDE" | "RESTORE", reason?: string) {
    const review = await WebsiteReview.findById(toObjectId(id));
    if (!review || review.isDeleted) {
      throw new AppError("Review not found", 404);
    }

    if (action === "HIDE") {
      review.status = "HIDDEN";
      review.hiddenReason = reason || "Hidden by admin";
      review.hiddenBy = toObjectId(adminId);
      review.hiddenAt = new Date();
    } else {
      review.status = "PUBLISHED";
      review.hiddenReason = undefined;
      review.hiddenBy = undefined;
      review.hiddenAt = undefined;
    }

    await review.save();
    return review;
  },
};
