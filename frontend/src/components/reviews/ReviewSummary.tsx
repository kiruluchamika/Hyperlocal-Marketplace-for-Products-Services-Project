import React from 'react';
import StarRating from './StarRating';
import { IReviewSummary } from '@/types/review';

interface ReviewSummaryProps {
  summary: IReviewSummary;
}

const ReviewSummary: React.FC<ReviewSummaryProps> = ({ summary }) => {
  const maxCount = Math.max(1, ...Object.values(summary.ratingBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Service Rating</p>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-4xl font-bold text-slate-900">{summary.averageRating.toFixed(1)}</p>
            <div>
              <StarRating rating={summary.averageRating} size="md" />
              <p className="mt-1 text-sm text-slate-500">{summary.reviewCount} public review{summary.reviewCount === 1 ? '' : 's'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary.ratingBreakdown?.[rating] || 0;
          const width = Math.max(0, Math.min(100, (count / maxCount) * 100));

          return (
            <div key={rating} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-slate-600">{rating}</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-amber-400" style={{ width: `${width}%` }} />
              </div>
              <span className="w-8 text-right text-slate-500">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewSummary;
