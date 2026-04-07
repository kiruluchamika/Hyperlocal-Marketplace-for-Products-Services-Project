import React from 'react';
import toast from 'react-hot-toast';
import { reviewsApi, websiteReviewsApi } from '@/api/services';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import AdminTable from '@/components/admin/AdminTable';
import Button from '@/components/ui/Button';
import StarRating from '@/components/reviews/StarRating';
import { IServiceReview, IWebsiteReview } from '@/types/review';

type ReviewScope = 'service' | 'website';
type ReviewRow = IServiceReview | IWebsiteReview;

const getReviewerName = (review: ReviewRow) => {
  if (typeof review.reviewerId === 'string') return 'User';
  return review.reviewerId?.name || 'User';
};

const isServiceReview = (review: ReviewRow): review is IServiceReview => {
  return 'serviceId' in review;
};

const AdminReviewsPage: React.FC = () => {
  const [reviews, setReviews] = React.useState<ReviewRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<'PUBLISHED' | 'HIDDEN' | ''>('');
  const [search, setSearch] = React.useState('');
  const [scope, setScope] = React.useState<ReviewScope>('service');

  const fetchReviews = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } =
        scope === 'service'
          ? await reviewsApi.listAdmin({
              status: statusFilter || undefined,
              search: search || undefined,
              limit: 50,
            })
          : await websiteReviewsApi.listAdmin({
              status: statusFilter || undefined,
              search: search || undefined,
              limit: 50,
            });
      setReviews(data.data || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [scope, search, statusFilter]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      void fetchReviews();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchReviews]);

  const handleModeration = async (review: ReviewRow, action: 'HIDE' | 'RESTORE') => {
    try {
      if (scope === 'service') {
        await reviewsApi.moderate(review._id, {
          action,
          reason: action === 'HIDE' ? 'Hidden by admin moderation' : undefined,
        });
      } else {
        await websiteReviewsApi.moderate(review._id, {
          action,
          reason: action === 'HIDE' ? 'Hidden by admin moderation' : undefined,
        });
      }
      toast.success(action === 'HIDE' ? 'Review hidden' : 'Review restored');
      await fetchReviews();
    } catch {
      // handled globally
    }
  };

  const columns = [
    {
      key: 'reviewerId',
      header: 'Reviewer',
      render: (row: ReviewRow) => (
        <div>
          <p className="font-medium text-slate-900">{getReviewerName(row)}</p>
          <p className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (row: ReviewRow) => (
        <div className="inline-flex items-center gap-2">
          <StarRating rating={row.rating} size="sm" />
          <span className="font-semibold text-slate-700">{row.rating.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: 'content',
      header: 'Review',
      render: (row: ReviewRow) => (
        <div>
          {row.title && <p className="text-sm font-semibold text-slate-800">{row.title}</p>}
          <p className="line-clamp-2 text-sm text-slate-600">{row.content}</p>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row: ReviewRow) => (
        <span className="text-xs uppercase tracking-wide text-slate-500">{isServiceReview(row) ? row.source : 'WEBSITE'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ReviewRow) => (
        <AdminBadge variant={row.status === 'PUBLISHED' ? 'success' : 'warning'}>{row.status}</AdminBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: ReviewRow) => (
        <div className="flex gap-2">
          {row.status === 'PUBLISHED' ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void handleModeration(row, 'HIDE')}>
              Hide
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => void handleModeration(row, 'RESTORE')}>
              Restore
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reviews"
        description="Moderate service and platform reviews, hide abusive content, and restore valid feedback."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setScope('service')}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              scope === 'service' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Service Reviews
          </button>
          <button
            type="button"
            onClick={() => setScope('website')}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              scope === 'website' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Website Reviews
          </button>
        </div>
        <div className="w-full max-w-sm">
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search reviews..." />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'PUBLISHED' | 'HIDDEN' | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
        >
          <option value="">All Status</option>
          <option value="PUBLISHED">Published</option>
          <option value="HIDDEN">Hidden</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <AdminTable columns={columns} data={reviews} loading={loading} emptyMessage="No reviews found" />
      </div>
    </div>
  );
};

export default AdminReviewsPage;
