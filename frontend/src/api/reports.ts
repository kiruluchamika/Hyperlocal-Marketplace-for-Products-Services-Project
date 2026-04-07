import apiClient from './client';

interface SubmitReportRequest {
  targetType: 'LISTING' | 'SERVICE' | 'USER';
  targetId: string;
  reason: 'SPAM' | 'FRAUD' | 'INAPPROPRIATE_CONTENT' | 'HARASSMENT' | 'DUPLICATE' | 'OTHER';
  description: string;
}

interface Report {
  _id: string;
  targetType: 'LISTING' | 'SERVICE' | 'USER';
  targetId: string;
  reporterId: string;
  reason: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = '/reports';

export const reportsApi = {
  /**
   * Submit a report for a listing, service, or user
   */
  submitReport: async (data: SubmitReportRequest) => {
    const response = await apiClient.post(API_BASE, data);
    return response.data;
  },

  /**
   * Get reports submitted by the current user
   */
  getUserReports: async (page = 1, limit = 20) => {
    const response = await apiClient.get(`${API_BASE}/me`, {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get all reports for admin review (admin only)
   */
  listReportsForAdmin: async (
    filters?: {
      status?: string;
      targetType?: string;
      reason?: string;
      page?: number;
      limit?: number;
    }
  ) => {
    const response = await apiClient.get(`${API_BASE}/admin/list`, {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get details of a single report
   */
  getReportDetails: async (reportId: string) => {
    const response = await apiClient.get(`${API_BASE}/${reportId}`);
    return response.data;
  },

  /**
   * Resolve a report (admin only)
   */
  resolveReport: async (
    reportId: string,
    data: {
      status: 'RESOLVED' | 'REJECTED';
      adminNotes?: string;
      actionTaken?: 'SUSPENDED' | 'WARNING_SENT' | 'NONE';
    }
  ) => {
    const response = await apiClient.patch(`${API_BASE}/${reportId}/resolve`, data);
    return response.data;
  },

  /**
   * Get reports by target
   */
  getReportsByTarget: async (targetType: string, targetId: string) => {
    const response = await apiClient.get(`${API_BASE}/target/query`, {
      params: { targetType, targetId },
    });
    return response.data;
  },
};
