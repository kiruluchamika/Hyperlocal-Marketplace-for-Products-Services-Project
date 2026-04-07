import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { reviewService } from "../services/reviewService";

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const reviewerId = req.user!.id;
  const review = await reviewService.createReview(reviewerId, req.body);

  res.status(201).json({ success: true, data: review });
});

export const listServiceReviews = asyncHandler(async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  const result = await reviewService.listServiceReviews(serviceId, req.query);

  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const getServiceReviewSummary = asyncHandler(async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  const summary = await reviewService.getServiceReviewSummary(serviceId);

  res.json({ success: true, data: summary });
});

export const getMyServiceReview = asyncHandler(async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  const review = await reviewService.getMyReviewForService(serviceId, req.user!.id);

  res.json({ success: true, data: review || null });
});

export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.updateReview(req.params.id, req.user!.id, req.body);

  res.json({ success: true, data: review });
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.deleteReview(req.params.id, req.user!.id, false);

  res.json({ success: true, message: result.message });
});

export const replyToReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.replyToReview(req.params.id, req.user!.id, req.body.content);

  res.json({ success: true, data: review });
});

export const listReviewsForAdmin = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.listReviewsForAdmin(req.query);

  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const moderateReview = asyncHandler(async (req: Request, res: Response) => {
  const { action, reason } = req.body;
  const result = await reviewService.moderateReview(req.params.id, req.user!.id, action, reason);

  res.json({ success: true, data: result });
});

export const deleteReviewByAdmin = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.deleteReview(req.params.id, req.user!.id, true);

  res.json({ success: true, message: result.message });
});

export const voteReviewHelpful = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.voteReviewHelpful(req.params.id, req.user!.id);

  res.json({ success: true, data: result });
});
