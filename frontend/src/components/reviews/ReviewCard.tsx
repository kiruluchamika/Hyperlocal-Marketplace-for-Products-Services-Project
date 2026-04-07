import React from 'react';
import { IServiceReview } from '@/types/review';
import StarRating from './StarRating';
import Button from '@/components/ui/Button';

interface ReviewCardProps {
  review: IServiceReview;
  canEdit?: boolean;
  canDelete?: boolean;
  canVoteHelpful?: boolean;
  onHelpful?: (review: IServiceReview) => void;
  helpfulLoading?: boolean;
  onEdit?: (review: IServiceReview) => void;
  onDelete?: (review: IServiceReview) => void;
}

const getReviewerName = (review: IServiceReview) => {
  if (typeof review.reviewerId === 'string') {
    return 'Marketplace User';
  }

  return review.reviewerId?.name || 'Marketplace User';
};

const getReviewerAvatar = (review: IServiceReview) => {
  if (typeof review.reviewerId === 'string') {
    return '';
  }

  return review.reviewerId?.profileImage || '';
};

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  canEdit,
  canDelete,
  canVoteHelpful,
  onHelpful,
  helpfulLoading,
  onEdit,
  onDelete,
}) => {
  const reviewerName = getReviewerName(review);
  const reviewerAvatar = getReviewerAvatar(review);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {reviewerAvatar ? (
            <img src={reviewerAvatar} alt={reviewerName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
              {reviewerName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-slate-900">{reviewerName}</p>
            <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} size="sm" />
          <span className="text-sm font-semibold text-slate-700">{review.rating.toFixed(1)}</span>
        </div>
      </div>

      {review.title && <h3 className="mt-3 text-sm font-semibold text-slate-900">{review.title}</h3>}
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{review.content}</p>

      {review.sellerResponse && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Seller Response</p>
          <p className="mt-1 text-sm text-slate-700">{review.sellerResponse.content}</p>
          <p className="mt-1 text-xs text-slate-500">{new Date(review.sellerResponse.respondedAt).toLocaleString()}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {canVoteHelpful && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            isLoading={helpfulLoading}
            onClick={() => onHelpful?.(review)}
          >
            Helpful ({review.helpfulCount || 0})
          </Button>
        )}

        {(canEdit || canDelete) && (
          <>
            {canEdit && (
              <Button type="button" size="sm" variant="outline" onClick={() => onEdit?.(review)}>
                Edit
              </Button>
            )}
            {canDelete && (
              <Button type="button" size="sm" variant="danger" onClick={() => onDelete?.(review)}>
                Delete
              </Button>
            )}
          </>
        )}
      </div>

    </article>
  );
};

export default ReviewCard;
