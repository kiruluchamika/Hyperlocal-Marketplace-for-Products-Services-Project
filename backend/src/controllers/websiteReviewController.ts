import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { websiteReviewService } from "../services/websiteReviewService";

export const createWebsiteReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await websiteReviewService.create(req.user!.id, req.body);
  res.status(201).json({ success: true, data: review });
});

export const listWebsiteReviews = asyncHandler(async (req: Request, res: Response) => {
  const result = await websiteReviewService.list(req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const getWebsiteReviewSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await websiteReviewService.summary();
  res.json({ success: true, data: summary });
});

export const getMyWebsiteReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await websiteReviewService.getMine(req.user!.id);
  res.json({ success: true, data: review || null });
});

export const updateWebsiteReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await websiteReviewService.update(req.params.id, req.user!.id, req.body);
  res.json({ success: true, data: review });
});

export const deleteWebsiteReview = asyncHandler(async (req: Request, res: Response) => {
  const result = await websiteReviewService.remove(req.params.id, req.user!.id, false);
  res.json({ success: true, message: result.message });
});

export const voteWebsiteReviewHelpful = asyncHandler(async (req: Request, res: Response) => {
  const result = await websiteReviewService.voteHelpful(req.params.id, req.user!.id);
  res.json({ success: true, data: result });
});

export const listWebsiteReviewsForAdmin = asyncHandler(async (req: Request, res: Response) => {
  const result = await websiteReviewService.listAdmin(req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const moderateWebsiteReview = asyncHandler(async (req: Request, res: Response) => {
  const result = await websiteReviewService.moderate(req.params.id, req.user!.id, req.body.action, req.body.reason);
  res.json({ success: true, data: result });
});

export const deleteWebsiteReviewByAdmin = asyncHandler(async (req: Request, res: Response) => {
  const result = await websiteReviewService.remove(req.params.id, req.user!.id, true);
  res.json({ success: true, message: result.message });
});
