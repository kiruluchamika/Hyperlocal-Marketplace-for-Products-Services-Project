import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiCheck, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { reportsApi } from '@/api/reports';
import AdminTable from '@/components/admin/AdminTable';
import AdminBadge from '@/components/admin/AdminBadge';
import GifLoader from '@/components/ui/GifLoader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface Report {
  _id: string;
  targetType: 'LISTING' | 'SERVICE' | 'USER';
  targetId: string;
  reporterId: any;
  reason: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
  adminNotes?: string;
  createdAt: string;
}

const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolveModal, setResolveModal] = useState(false);
  const [resolution, setResolution] = useState({ status: 'RESOLVED' as 'RESOLVED' | 'REJECTED', notes: '' });
  const [filters, setFilters] = useState({ status: '', targetType: '' });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await reportsApi.listReportsForAdmin(filters);
      setReports(res.reports);
    } catch (err: any) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const handleResolve = async () => {
    if (!selectedReport) return;
    try {
      await reportsApi.resolveReport(selectedReport._id, {
        status: resolution.status,
        adminNotes: resolution.notes,
      });
      toast.success('Report resolved successfully');
      setResolveModal(false);
      setSelectedReport(null);
      fetchReports();
    } catch (err: any) {
      toast.error('Failed to resolve report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <GifLoader size="md" label="Loading reports..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-600">Manage abuse and compliance reports</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          value={filters.targetType}
          onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="">All Types</option>
          <option value="LISTING">Listing</option>
          <option value="SERVICE">Service</option>
          <option value="USER">User</option>
        </select>
      </div>

      {/* Reports Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <AdminTable
          columns={[
            {
              key: 'targetType',
              header: 'Type',
              render: (row) => (
                <span className="text-sm font-medium">{row.targetType}</span>
              ),
            },
            {
              key: 'reason',
              header: 'Reason',
              render: (row) => (
                <span className="text-sm">{row.reason}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <AdminBadge status={row.status.toLowerCase()} />
              ),
            },
            {
              key: 'createdAt',
              header: 'Reported',
              render: (row) => (
                <span className="text-sm text-slate-600">
                  {new Date(row.createdAt).toLocaleDateString()}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedReport(row);
                    setResolveModal(true);
                  }}
                >
                  Review
                </Button>
              ),
            },
          ]}
          data={reports}
          loading={loading}
        />
      </div>

      {/* Resolution Modal */}
      {resolveModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold">Resolve Report</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Report Details</label>
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded">{selectedReport.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Resolution</label>
              <select
                value={resolution.status}
                onChange={(e) => setResolution({ ...resolution, status: e.target.value as 'RESOLVED' | 'REJECTED' })}
                className="w-full px-4 py-2 border border-slate-300 rounded"
              >
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Admin Notes</label>
              <textarea
                value={resolution.notes}
                onChange={(e) => setResolution({ ...resolution, notes: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded text-sm h-20 resize-none"
                placeholder="Add notes about this resolution..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResolveModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleResolve}
                className="flex-1"
              >
                Resolve Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
