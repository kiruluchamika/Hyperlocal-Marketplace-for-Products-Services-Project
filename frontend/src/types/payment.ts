export type PaymentStatus = 'INITIATED' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'FAILED';

export interface IPayment {
  _id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  provider: 'STRIPE';
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
