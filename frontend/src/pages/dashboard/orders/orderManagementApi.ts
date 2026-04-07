import apiClient from '@/api/client';
import type { DeliveryMethod, OrderStatus } from '@/types/order';
import type { PaymentStatus } from '@/types/payment';
import type {
  CreateOrderPayload,
  CreateOrderResult,
  InitiatePaymentResult,
  ListOrdersParams,
  ListOrdersResult,
  ManagedOrder,
  ManagedPayment,
  OrderAction,
  OrderListingSnapshot,
  OrderParty,
} from './orderManagementTypes';

const ORDER_ACTIONS: OrderAction[] = [
  'CANCEL',
  'INITIATE_PAYMENT',
  'CONFIRM_RECEIVED',
  'CONFIRM_RECEIVED_WITH_OTP',
  'ACCEPT',
  'REJECT',
  'START',
  'COMPLETE_WITH_OTP',
  'MARK_COMPLETED',
  'OVERRIDE_STATUS',
];

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'INITIATED',
  'HELD',
  'RELEASED',
  'REFUNDED',
  'FAILED',
];

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asOptionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const normalizeId = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);

  const record = asRecord(value);
  const nestedId = record.id ?? record._id;

  if (typeof nestedId === 'string') return nestedId;
  if (typeof nestedId === 'number') return String(nestedId);

  if (value && typeof value === 'object' && 'toString' in value) {
    const idFromToString = (value as { toString: () => string }).toString();
    if (idFromToString && idFromToString !== '[object Object]') {
      return idFromToString;
    }
  }

  return '';
};

const pickResponseData = (payload: unknown): unknown => {
  const record = asRecord(payload);
  return record.data ?? payload;
};

const parseOrderStatus = (value: unknown): OrderStatus => {
  const status = asString(value).toUpperCase() as OrderStatus;
  return ORDER_STATUSES.includes(status) ? status : 'PENDING';
};

const parsePaymentStatus = (value: unknown): PaymentStatus => {
  const status = asString(value).toUpperCase() as PaymentStatus;
  return PAYMENT_STATUSES.includes(status) ? status : 'INITIATED';
};

const parseOrderActionList = (actions: unknown): OrderAction[] => {
  if (!Array.isArray(actions)) return [];
  return actions
    .map((item) => asString(item).toUpperCase())
    .filter((item): item is OrderAction => ORDER_ACTIONS.includes(item as OrderAction));
};

const normalizeParty = (value: unknown): OrderParty | undefined => {
  if (!value) return undefined;

  if (typeof value === 'string') {
    return { id: value };
  }

  const record = asRecord(value);
  const id = normalizeId(record);

  if (!id) return undefined;

  return {
    id,
    name: asString(record.name) || undefined,
    email: asString(record.email) || undefined,
  };
};

const normalizeListing = (value: unknown): OrderListingSnapshot | undefined => {
  if (!value) return undefined;

  if (typeof value === 'string') {
    return { id: value };
  }

  const record = asRecord(value);
  const id = normalizeId(record);

  if (!id) return undefined;

  return {
    id,
    title: asString(record.title) || undefined,
    price: typeof record.price === 'number' ? record.price : undefined,
  };
};

const normalizeOrder = (orderLike: unknown, actionsLike?: unknown): ManagedOrder => {
  const record = asRecord(orderLike);

  const buyer = normalizeParty(record.buyerId);
  const seller = normalizeParty(record.sellerId);
  const listing = normalizeListing(record.listingId);

  const deliveryMethodRaw = asString(record.deliveryMethod).toUpperCase();
  const deliveryMethod: DeliveryMethod =
    deliveryMethodRaw === 'DELIVERY' ? 'DELIVERY' : 'PICKUP';

  return {
    id: normalizeId(record),
    buyerId: buyer?.id || normalizeId(record.buyerId),
    sellerId: seller?.id || normalizeId(record.sellerId),
    listingId: listing?.id || normalizeId(record.listingId),
    buyer,
    seller,
    listing,
    titleSnapshot: asString(record.titleSnapshot),
    unitPriceSnapshot: asNumber(record.unitPriceSnapshot),
    quantity: asNumber(record.quantity, 1),
    totalAmount: asNumber(record.totalAmount),
    deliveryMethod,
    deliveryAddress: asString(record.deliveryAddress) || undefined,
    pickupLocationSnapshot: asString(record.pickupLocationSnapshot) || undefined,
    note: asString(record.note) || undefined,
    status: parseOrderStatus(record.status),
    paymentId: normalizeId(record.paymentId) || undefined,
    createdAt: asString(record.createdAt),
    updatedAt: asString(record.updatedAt),
    actionsAllowed: parseOrderActionList(actionsLike),
  };
};

const normalizePayment = (paymentLike: unknown): ManagedPayment => {
  const record = asRecord(paymentLike);
  const metadata = asRecord(record.metadata);

  return {
    id: normalizeId(record),
    orderId: normalizeId(record.orderId),
    buyerId: normalizeId(record.buyerId) || undefined,
    sellerId: normalizeId(record.sellerId) || undefined,
    amount: asNumber(record.amount),
    currency: asString(record.currency, 'LKR'),
    status: parsePaymentStatus(record.status),
    providerPaymentId: asString(record.providerPaymentId) || undefined,
    payoutStatus: asString(metadata.payoutStatus) as ManagedPayment['payoutStatus'] | undefined,
    stripeTransferId: asString(metadata.stripeTransferId) || undefined,
    payoutError: asString(metadata.payoutError) || undefined,
    payoutAttemptedAt: asString(metadata.payoutAttemptedAt) || undefined,
    payoutGrossAmount: asOptionalNumber(metadata.payoutGrossAmount),
    payoutFeePercent: asOptionalNumber(metadata.payoutFeePercent),
    payoutFeeAmount: asOptionalNumber(metadata.payoutFeeAmount),
    payoutNetAmount: asOptionalNumber(metadata.payoutNetAmount),
    createdAt: asString(record.createdAt) || undefined,
    updatedAt: asString(record.updatedAt) || undefined,
  };
};

const readPagination = (
  paginationLike: unknown,
  fallback: { page: number; limit: number; total: number }
) => {
  const record = asRecord(paginationLike);
  const page = asNumber(record.page, fallback.page);
  const limit = asNumber(record.limit, fallback.limit);
  const total = asNumber(record.total, fallback.total);
  const totalPages = asNumber(
    record.totalPages,
    Math.max(1, Math.ceil(total / Math.max(1, limit)))
  );

  return {
    page,
    limit,
    total,
    totalPages,
  };
};

const extractOrderFromMutation = (payload: unknown): ManagedOrder => {
  const container = asRecord(pickResponseData(payload));
  const orderLike = container.order ?? container;
  const actionsLike = container.actionsAllowed ?? container.allowedActions;
  return normalizeOrder(orderLike, actionsLike);
};

const mutateOrder = async (
  method: 'patch' | 'put' | 'post',
  url: string,
  body?: Record<string, unknown>
): Promise<ManagedOrder> => {
  const response =
    method === 'patch'
      ? await apiClient.patch(url, body)
      : method === 'put'
        ? await apiClient.put(url, body)
        : await apiClient.post(url, body);

  return extractOrderFromMutation(response.data);
};

export const orderManagementApi = {
  async listOrders(params?: ListOrdersParams): Promise<ListOrdersResult> {
    const response = await apiClient.get('/orders', { params });
    const payload = asRecord(response.data);
    const data = pickResponseData(payload);

    const dataRecord = asRecord(data);
    const rows = Array.isArray(data)
      ? data
      : Array.isArray(dataRecord.orders)
        ? dataRecord.orders
        : Array.isArray(payload.orders)
          ? payload.orders
          : [];

    const orders = rows.map((item) => {
      const row = asRecord(item);
      const orderLike = row.order ?? row;
      const actionsLike = row.actionsAllowed ?? row.allowedActions;
      return normalizeOrder(orderLike, actionsLike);
    });

    const pagination = readPagination(payload.pagination ?? dataRecord.pagination, {
      page: params?.page ?? 1,
      limit: params?.limit ?? Math.max(orders.length, 1),
      total: orders.length,
    });

    return {
      orders,
      pagination,
    };
  },

  async getOrderById(id: string): Promise<ManagedOrder> {
    const response = await apiClient.get(`/orders/${id}`);
    const data = asRecord(pickResponseData(response.data));
    const orderLike = data.order ?? data;
    const actionsLike = data.actionsAllowed ?? data.allowedActions;
    return normalizeOrder(orderLike, actionsLike);
  },

  async createOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
    const response = await apiClient.post('/orders', payload);
    const data = asRecord(pickResponseData(response.data));
    const orderLike = data.order ?? data;

    return {
      order: normalizeOrder(orderLike),
      nextStep: asString(data.nextStep) || undefined,
    };
  },

  async cancelOrder(id: string, reason?: string): Promise<ManagedOrder> {
    const body = reason ? { reason } : undefined;
    return mutateOrder('patch', `/orders/${id}/cancel`, body);
  },

  async confirmReceived(id: string): Promise<ManagedOrder> {
    return mutateOrder('patch', `/orders/${id}/confirm-received`);
  },

  async confirmReceivedWithOtp(id: string, otp: string): Promise<ManagedOrder> {
    return mutateOrder('post', `/orders/${id}/confirm-received-otp`, { otp });
  },

  async updateDeliveryDetails(
    id: string,
    payload: { deliveryMethod: DeliveryMethod; deliveryAddress?: string }
  ): Promise<ManagedOrder> {
    return mutateOrder('put', `/orders/${id}/delivery-details`, payload as Record<string, unknown>);
  },

  async acceptOrder(id: string): Promise<ManagedOrder> {
    return mutateOrder('patch', `/orders/${id}/accept`);
  },

  async rejectOrder(id: string, reason?: string): Promise<ManagedOrder> {
    const body = reason ? { reason } : undefined;
    return mutateOrder('patch', `/orders/${id}/reject`, body);
  },

  async startOrder(id: string): Promise<ManagedOrder> {
    return mutateOrder('patch', `/orders/${id}/start`);
  },

  async confirmDeliveryWithOtp(id: string, otp: string): Promise<ManagedOrder> {
    return mutateOrder('post', `/orders/${id}/confirm-delivery`, { otp });
  },

  async initiatePayment(orderId: string): Promise<InitiatePaymentResult> {
    const response = await apiClient.post('/payments/initiate', { orderId });
    const data = asRecord(pickResponseData(response.data));

    const clientSecret = asString(data.clientSecret);
    if (!clientSecret) {
      throw new Error('Stripe client secret was not returned by the backend.');
    }

    return {
      paymentId: normalizeId(data.paymentId),
      clientSecret,
      amount: asNumber(data.amount),
      currency: asString(data.currency, 'LKR'),
      status: parsePaymentStatus(data.status),
    };
  },

  async confirmPayment(orderId: string, paymentIntentId?: string): Promise<ManagedPayment> {
    const response = await apiClient.post('/payments/confirm', {
      orderId,
      paymentIntentId,
    });
    const data = pickResponseData(response.data);
    return normalizePayment(data);
  },

  async getPaymentByOrder(orderId: string): Promise<ManagedPayment> {
    const response = await apiClient.get(`/payments/order/${orderId}`);
    const data = pickResponseData(response.data);
    return normalizePayment(data);
  },
};
