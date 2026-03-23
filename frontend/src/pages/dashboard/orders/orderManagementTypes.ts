import type { DeliveryMethod, OrderStatus } from '@/types/order';
import type { PaymentStatus } from '@/types/payment';

export type OrderAction =
  | 'CANCEL'
  | 'INITIATE_PAYMENT'
  | 'CONFIRM_RECEIVED'
  | 'ACCEPT'
  | 'REJECT'
  | 'START'
  | 'COMPLETE_WITH_OTP'
  | 'MARK_COMPLETED'
  | 'OVERRIDE_STATUS';

export interface OrderParty {
  id: string;
  name?: string;
  email?: string;
}

export interface OrderListingSnapshot {
  id: string;
  title?: string;
  price?: number;
}

export interface ManagedOrder {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  buyer?: OrderParty;
  seller?: OrderParty;
  listing?: OrderListingSnapshot;
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
  createdAt: string;
  updatedAt: string;
  actionsAllowed: OrderAction[];
}

export interface ManagedPayment {
  id: string;
  orderId: string;
  buyerId?: string;
  sellerId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerPaymentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListOrdersParams {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export interface ListOrdersResult {
  orders: ManagedOrder[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}

export interface CreateOrderPayload {
  listingId: string;
  quantity: number;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  note?: string;
}

export interface CreateOrderResult {
  order: ManagedOrder;
  nextStep?: string;
}

export interface InitiatePaymentResult {
  paymentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}
