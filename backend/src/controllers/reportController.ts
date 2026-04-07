import { Request, Response } from "express";
import { reportService } from "../services/reportService";
import { asyncHandler } from "../utils/asyncHandler";

export const submitReport = asyncHandler(async (req: Request, res: Response) => {
  const { targetType, targetId, reason, description } = req.body;
  const reporterId = req.user!.id;

  const report = await reportService.submitReport(reporterId, targetType, targetId, reason, description);

  res.status(201).json({
    message: "Report submitted successfully",
    report,
  });
});

export const listReportsForAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { status, targetType, reason, page, limit } = req.query;

  const { reports, total } = await reportService.listReports({
    status: status as string,
    targetType: targetType as string,
    reason: reason as string,
    page: parseInt(page as string) || 1,
    limit: parseInt(limit as string) || 20,
  });

  res.status(200).json({
    reports,
    pagination: {
      total,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
    },
  });
});

export const getReportDetails = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const report = await reportService.getReportDetails(id);

  res.status(200).json(report);
});

export const resolveReport = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminNotes, actionTaken } = req.body;
  const adminId = req.user!.id;

  const report = await reportService.resolveReport(id, adminId, status, adminNotes, actionTaken);

  res.status(200).json({
    message: "Report resolved successfully",
    report,
  });
});

export const getUserReports = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { page, limit } = req.query;

  const { reports, total } = await reportService.getUserReports(
    userId,
    parseInt(page as string) || 1,
    parseInt(limit as string) || 20
  );

  res.status(200).json({
    reports,
    pagination: {
      total,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
    },
  });
});

export const getReportsByTarget = asyncHandler(async (req: Request, res: Response) => {
  const { targetType, targetId } = req.query;

  if (!targetType || !targetId) {
    throw new Error("targetType and targetId are required");
  }

  const reports = await reportService.getReportsByTarget(
    targetType as "LISTING" | "SERVICE" | "USER",
    targetId as string
  );

  res.json(reports);
});
