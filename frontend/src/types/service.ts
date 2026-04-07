import { IUser } from './user';
import { ICategory } from './category';

export type PricingType = 'FIXED' | 'HOURLY';
export type ServiceStatus = 'ACTIVE' | 'REMOVED' | 'DELETED';
export type BookingStatus = 'PENDING' | 'PROVIDER_ACCEPTED' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

export interface IServiceLocation {
  city: string;
  address?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface IServiceSelling {
  _id: string;
  sellerId: string | IUser;
  title: string;
  description: string;
  categoryId: string | ICategory;
  price: number;
  pricingType: PricingType;
  locationText: string;
  location?: IServiceLocation;
  images: string[];
  attributeValues: Record<string, unknown>;
  status: ServiceStatus;
  isActive: boolean;
  averageRating?: number;
  reviewCount?: number;
  ratingBreakdown?: Record<number, number>;
  removedReason?: string;
  removedBy?: string;
  removedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingDeposit {
  amount: number;
  currency: string;
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
  payoutStatus?: 'TRANSFER_CREATED' | 'TRANSFER_FAILED' | 'SKIPPED_NOT_ELIGIBLE';
  payoutGrossAmount?: number;
  payoutFeePercent?: number;
  payoutFeeAmount?: number;
  payoutNetAmount?: number;
  payoutError?: string;
  payoutAttemptedAt?: string;
  paidAt?: string;
}

export interface IServiceBookingSlot {
  startAt: string;
  endAt: string;
}

export interface IServiceBooking {
  _id: string;
  serviceId: string | IServiceSelling;
  buyerId: string | IUser;
  providerId: string | IUser;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  note?: string;
  status: BookingStatus;
  deposit?: BookingDeposit;
  createdAt: string;
  updatedAt: string;
  isSlotTaken?: boolean;
}
