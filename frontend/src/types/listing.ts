import { IUser } from './user';
import { ICategory } from './category';

export type TransactionMode = 'BUY_NOW' | 'NEGOTIABLE';
export type Condition = 'NEW' | 'USED_LIKE_NEW' | 'USED_GOOD' | 'USED_FAIR';
export type ListingStatus = 'ACTIVE' | 'SOLD' | 'HIDDEN' | 'DELETED';

export interface GeoLocation {
  city: string;
  address?: string;
  coordinates: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface IProductListing {
  _id: string;
  ownerId: string | IUser;
  type: 'PRODUCT';
  transactionMode: TransactionMode;
  title: string;
  description: string;
  categoryId: string | ICategory;
  attributes: Record<string, unknown>;
  price: number;
  currency: string;
  isNegotiable: boolean;
  condition: Condition;
  images: string[];
  location: GeoLocation;
  status: ListingStatus;
  tags: string[];
  viewsCount: number;
  savedCount: number;
  createdAt: string;
  updatedAt: string;
}
