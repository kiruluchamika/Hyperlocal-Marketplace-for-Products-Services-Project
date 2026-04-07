import Report, { IReport } from "../models/Report";
import User from "../models/User";
import ProductListing from "../models/ProductListing";
import ServiceListing from "../models/ServiceSelling";
import { createAdminBroadcast, createUserNotification } from "./notificationService";
import { AppError } from "../utils/AppError";
import { NotificationType } from "../models/Notification";

const REPORT_ESCALATION_THRESHOLD = 3; // Auto-escalate to UNDER_REVIEW after N open reports

export const reportService = {
  /**
   * Submit a report for a listing, service, or user
   * Auto-escalates target to UNDER_REVIEW if threshold is reached
   */
  async submitReport(
    reporterId: string,
    targetType: "LISTING" | "SERVICE" | "USER",
    targetId: string,
    reason: string,
    description: string
  ): Promise<IReport> {
    // Check for existing report by same reporter on same target in last 24 hours
    const existingReport = await Report.findOne({
      targetType,
      targetId,
      reporterId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (existingReport) {
      throw new AppError("You have already reported this item in the last 24 hours", 400);
    }

    // Validate target exists
    const target = await this.validateTarget(targetType, targetId);
    if (!target) {
      throw new AppError(`${targetType} not found`, 404);
    }

    // Create report
    const report = await Report.create({
      targetType,
      targetId,
      reporterId,
      reason,
      description,
      status: "OPEN",
    });

    // Notify admins
    await createAdminBroadcast({
      title: `New ${targetType} report`,
      message: `A report was submitted for ${targetType.toLowerCase()}: ${description.substring(0, 50)}...`,
      type: NotificationType.REPORT,
      entityType: targetType,
      entityId: targetId,
    });

    // Check if escalation threshold is reached
    const openReportCount = await Report.countDocuments({
      targetType,
      targetId,
      status: "OPEN",
    });

    if (openReportCount >= REPORT_ESCALATION_THRESHOLD) {
      await Report.updateMany(
        { targetType, targetId, status: "OPEN" },
        { status: "UNDER_REVIEW" }
      );

      // If listing, update its status
      if (targetType === "LISTING") {
        await ProductListing.updateOne(
          { _id: targetId },
          { status: "UNDER_REVIEW", suspendReason: "Multiple abuse reports received" }
        );
      }

      // Notify admins of escalation
      await createAdminBroadcast({
        title: `Report escalation: ${targetType}`,
        message: `${targetType} ${targetId} has reached escalation threshold and is now UNDER_REVIEW`,
        type: NotificationType.REPORT,
        entityType: targetType,
        entityId: targetId,
      });
    }

    return report;
  },

  /**
   * Get all reports for admin dashboard with optional filters
   */
  async listReports(
    filters?: {
      status?: string;
      targetType?: string;
      reason?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ reports: IReport[]; total: number }> {
    const query: any = {};

    if (filters?.status) query.status = filters.status;
    if (filters?.targetType) query.targetType = filters.targetType;
    if (filters?.reason) query.reason = filters.reason;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate("reporterId", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(query),
    ]);

    return { reports, total };
  },

  /**
   * Get reports submitted by a specific user
   */
  async getUserReports(userId: string, page = 1, limit = 20): Promise<{ reports: IReport[]; total: number }> {
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find({ reporterId: userId })
        .populate("targetType targetId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments({ reporterId: userId }),
    ]);

    return { reports, total };
  },

  /**
   * Get details of a single report
   */
  async getReportDetails(reportId: string): Promise<IReport> {
    const report = await Report.findById(reportId).populate("reporterId", "name email phone");

    if (!report) {
      throw new AppError("Report not found", 404);
    }

    return report;
  },

  /**
   * Resolve a report (approved or rejected by admin)
   */
  async resolveReport(
    reportId: string,
    adminId: string,
    status: "RESOLVED" | "REJECTED",
    adminNotes?: string,
    actionTaken?: "SUSPENDED" | "WARNING_SENT" | "NONE"
  ): Promise<IReport> {
    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        status,
        adminNotes,
        resolvedBy: adminId,
        resolvedAt: new Date(),
        actionTaken: actionTaken || "NONE",
      },
      { new: true }
    ).populate("reporterId");

    if (!report) {
      throw new AppError("Report not found", 404);
    }

    // Notify reporter of resolution
    await createUserNotification(
      report.reporterId as any,
      {
        title: `Your report has been ${status.toLowerCase()}`,
        message: `Report ID: ${reportId}`,
        type: NotificationType.REPORT,
        entityType: "REPORT",
        entityId: reportId,
      }
    );

    return report;
  },

  /**
   * Get reports by target (to show context in admin)
   */
  async getReportsByTarget(
    targetType: "LISTING" | "SERVICE" | "USER",
    targetId: string
  ): Promise<IReport[]> {
    return Report.find({ targetType, targetId })
      .populate("reporterId", "name email phone")
      .sort({ createdAt: -1 });
  },

  /**
   * Validate that a target exists and return it
   */
  async validateTarget(
    targetType: "LISTING" | "SERVICE" | "USER",
    targetId: string
  ): Promise<any> {
    switch (targetType) {
      case "LISTING":
        return ProductListing.findById(targetId);
      case "SERVICE":
        return ServiceListing.findById(targetId);
      case "USER":
        return User.findById(targetId);
      default:
        return null;
    }
  },
};
