import { IUser } from './user';
import { IProductListing } from './listing';

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type DeliveryMethod = 'PICKUP' | 'DELIVERY';

export interface IOrder {
  _id: string;
  buyerId: string | IUser;
  sellerId: string | IUser;
  listingId: string | IProductListing;
  titleSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  totalAmount: number;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  pickupLocationSnapshot?: string;
  note?: string;
  status: OrderStatus;
  paymentId?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
