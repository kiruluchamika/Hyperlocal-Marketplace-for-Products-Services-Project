export type ReviewStatus = 'PUBLISHED' | 'HIDDEN';
export type ReviewSort = 'latest' | 'oldest' | 'ratingHigh' | 'ratingLow' | 'helpful';

export interface IReviewUserSnapshot {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  profileImage?: string;
}

export interface IServiceReview {
  _id: string;
  serviceId: string;
  sellerId: string;
  reviewerId: string | IReviewUserSnapshot;
  bookingId?: string;
  source: 'PUBLIC' | 'BOOKING';
  rating: number;
  title?: string;
  content: string;
  status: ReviewStatus;
  helpfulCount?: number;
  sellerResponse?: {
    content: string;
    respondedAt: string;
  };
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IReviewSummary {
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: Record<number, number>;
}

export interface IWebsiteReview {
  _id: string;
  reviewerId: string | IReviewUserSnapshot;
  rating: number;
  title?: string;
  content: string;
  status: ReviewStatus;
  helpfulCount?: number;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IReviewPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
