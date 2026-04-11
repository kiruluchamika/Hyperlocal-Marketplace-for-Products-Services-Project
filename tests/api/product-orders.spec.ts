import { test, expect, type APIRequestContext } from '@playwright/test';

const API_BASE_URL = 'http://localhost:5000/api';

type CategoryAttribute = {
  fieldName: string;
  fieldType: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  options?: string[];
};

type ProductCategory = {
  _id: string;
  name: string;
  type: 'PRODUCT' | 'SERVICE';
  attributes: CategoryAttribute[];
  isActive: boolean;
};

type RegisteredUser = {
  id: string;
  token: string;
};

type ProductListing = {
  _id: string;
  ownerId: string | { _id?: string; id?: string };
  title: string;
  price: number;
  transactionMode: 'BUY_NOW' | 'NEGOTIABLE';
  status: 'ACTIVE' | 'SOLD' | 'HIDDEN' | 'DELETED' | 'SUSPENDED' | 'UNDER_REVIEW';
};

type ProductOrder = {
  id?: string;
  _id?: string;
  buyerId: string | { _id?: string; id?: string; name?: string; email?: string };
  sellerId: string | { _id?: string; id?: string; name?: string; email?: string };
  listingId: string | { _id?: string; id?: string; title?: string; price?: number };
  titleSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  totalAmount: number;
  deliveryMethod: 'PICKUP' | 'DELIVERY';
  deliveryAddress?: string;
  pickupLocationSnapshot?: string;
  note?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
};

const entityId = (value: string | { _id?: string; id?: string } | undefined) => {
  if (!value) return undefined;
  return typeof value === 'string' ? value : value._id ?? value.id;
};

const orderId = (order: ProductOrder) => order.id ?? order._id;

const registerRegularUser = async (
  request: APIRequestContext,
  name = 'Product Order Test User',
): Promise<RegisteredUser> => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      name,
      email: `product-order-test-${unique}@example.com`,
      password: 'password123',
      phone: '+94770000000',
      age: 25,
      address: {
        city: 'Colombo',
        country: 'Sri Lanka',
      },
    },
  });

  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body?.user?.id).toEqual(expect.any(String));
  expect(body?.user?.role).toBe('user');
  expect(body?.token).toEqual(expect.any(String));

  return {
    id: body.user.id as string,
    token: body.token as string,
  };
};

const getActiveProductCategory = async (request: APIRequestContext) => {
  const response = await request.get(`${API_BASE_URL}/categories`, {
    params: {
      type: 'PRODUCT',
      isActive: 'true',
      page: 1,
      limit: 20,
    },
  });

  expect(response.status()).toBe(200);

  const body = (await response.json()) as { data: ProductCategory[] };
  return body.data.find((category) => category.type === 'PRODUCT' && category.isActive);
};

const attributeValueFor = (attribute: CategoryAttribute) => {
  if (attribute.fieldType === 'select') return attribute.options?.[0] ?? 'Other';
  if (attribute.fieldType === 'number') return 1;
  if (attribute.fieldType === 'boolean') return true;
  return `Test ${attribute.fieldName}`;
};

const productListingPayloadFor = (category: ProductCategory, unique: string) => ({
  title: `Playwright order product ${unique}`,
  description: 'A focused product listing created for Playwright order tests.',
  categoryId: category._id,
  price: 1250,
  currency: 'LKR',
  condition: 'USED_GOOD',
  transactionMode: 'BUY_NOW',
  isNegotiable: false,
  images: ['https://example.com/product-order-test.jpg'],
  location: {
    city: 'Colombo',
    address: 'Playwright pickup address',
    coordinates: {
      type: 'Point',
      coordinates: [79.8612, 6.9271],
    },
  },
  tags: ['playwright', 'product-order'],
  attributes: Object.fromEntries((category.attributes ?? []).map((attribute) => [
    attribute.fieldName,
    attributeValueFor(attribute),
  ])),
});

const createBuyNowProductListing = async (
  request: APIRequestContext,
  token: string,
) => {
  const category = await getActiveProductCategory(request);

  if (!category) {
    test.skip(true, 'No active PRODUCT category is available for product order tests.');
    throw new Error('Skipped: no active PRODUCT category');
  }

  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await request.post(`${API_BASE_URL}/listings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: productListingPayloadFor(category, unique),
  });

  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body?.success).toBe(true);
  expect(body.data?._id).toEqual(expect.any(String));
  expect(body.data?.title).toBe(`Playwright order product ${unique}`);
  expect(body.data?.transactionMode).toBe('BUY_NOW');
  expect(body.data?.status).toBe('ACTIVE');

  return body.data as ProductListing;
};

const deleteProductListing = async (
  request: APIRequestContext,
  token: string,
  listingId: string,
) => {
  const response = await request.delete(`${API_BASE_URL}/listings/${listingId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(200);
};

const cancelPendingOrder = async (
  request: APIRequestContext,
  token: string,
  id: string | undefined,
) => {
  if (!id) return;

  try {
    await request.patch(`${API_BASE_URL}/orders/${id}/cancel`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        reason: 'Cleaning up Playwright order test',
      },
    });
  } catch {
    // Best-effort cleanup only. The assertion belongs to the test body.
  }
};

const expectCreatedOrderShape = (order: ProductOrder) => {
  expect(orderId(order)).toEqual(expect.any(String));
  expect(entityId(order.buyerId)).toEqual(expect.any(String));
  expect(entityId(order.sellerId)).toEqual(expect.any(String));
  expect(entityId(order.listingId)).toEqual(expect.any(String));
  expect(order.titleSnapshot).toEqual(expect.any(String));
  expect(order.unitPriceSnapshot).toEqual(expect.any(Number));
  expect(order.quantity).toEqual(expect.any(Number));
  expect(order.totalAmount).toEqual(expect.any(Number));
  expect(['PICKUP', 'DELIVERY']).toContain(order.deliveryMethod);
  expect(['PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).toContain(order.status);
  expect(order.createdAt).toEqual(expect.any(String));
  expect(order.updatedAt).toEqual(expect.any(String));
};

test('buyer can create a pending product order for another user BUY_NOW listing', async ({ request }) => {
  const seller = await registerRegularUser(request, 'Product Order Seller');
  const buyer = await registerRegularUser(request, 'Product Order Buyer');
  const listing = await createBuyNowProductListing(request, seller.token);
  let createdOrderId: string | undefined;

  try {
    const response = await request.post(`${API_BASE_URL}/orders`, {
      headers: {
        Authorization: `Bearer ${buyer.token}`,
      },
      data: {
        listingId: listing._id,
        quantity: 2,
        deliveryMethod: 'PICKUP',
        note: 'Please keep this ready for pickup.',
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body?.success).toBe(true);
    expect(body?.message).toBe('Order created successfully. Please proceed to payment.');
    expect(body?.data?.nextStep).toBe('INITIATE_PAYMENT');

    const order = body.data.order as ProductOrder;
    createdOrderId = orderId(order);
    expectCreatedOrderShape(order);
    expect(entityId(order.buyerId)).toBe(buyer.id);
    expect(entityId(order.sellerId)).toBe(seller.id);
    expect(entityId(order.listingId)).toBe(listing._id);
    expect(order.titleSnapshot).toBe(listing.title);
    expect(order.unitPriceSnapshot).toBe(listing.price);
    expect(order.quantity).toBe(2);
    expect(order.totalAmount).toBe(listing.price * 2);
    expect(order.deliveryMethod).toBe('PICKUP');
    expect(order.pickupLocationSnapshot).toBe('Playwright pickup address, Colombo');
    expect(order.status).toBe('PENDING');
  } finally {
    await cancelPendingOrder(request, buyer.token, createdOrderId);
    await deleteProductListing(request, seller.token, listing._id);
  }
});

test('listing owner cannot create a product order for their own listing', async ({ request }) => {
  const seller = await registerRegularUser(request, 'Product Order Self Purchase Seller');
  const listing = await createBuyNowProductListing(request, seller.token);

  try {
    const response = await request.post(`${API_BASE_URL}/orders`, {
      headers: {
        Authorization: `Bearer ${seller.token}`,
      },
      data: {
        listingId: listing._id,
        quantity: 1,
        deliveryMethod: 'PICKUP',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body?.message).toBe('You cannot order your own listing');
  } finally {
    await deleteProductListing(request, seller.token, listing._id);
  }
});

test('buyer can cancel their own pending product order', async ({ request }) => {
  const seller = await registerRegularUser(request, 'Product Order Cancel Seller');
  const buyer = await registerRegularUser(request, 'Product Order Cancel Buyer');
  const listing = await createBuyNowProductListing(request, seller.token);
  let createdOrderId: string | undefined;

  try {
    const createResponse = await request.post(`${API_BASE_URL}/orders`, {
      headers: {
        Authorization: `Bearer ${buyer.token}`,
      },
      data: {
        listingId: listing._id,
        quantity: 1,
        deliveryMethod: 'DELIVERY',
        deliveryAddress: '123 Playwright Delivery Street, Colombo',
      },
    });

    expect(createResponse.status()).toBe(201);

    const createBody = await createResponse.json();
    const createdOrder = createBody.data.order as ProductOrder;
    createdOrderId = orderId(createdOrder);
    expect(createdOrderId).toEqual(expect.any(String));
    expect(createdOrder.status).toBe('PENDING');
    expect(createdOrder.deliveryMethod).toBe('DELIVERY');
    expect(createdOrder.deliveryAddress).toBe('123 Playwright Delivery Street, Colombo');

    const cancelResponse = await request.patch(`${API_BASE_URL}/orders/${createdOrderId}/cancel`, {
      headers: {
        Authorization: `Bearer ${buyer.token}`,
      },
      data: {
        reason: 'Buyer changed pickup plan',
      },
    });

    expect(cancelResponse.status()).toBe(200);

    const cancelBody = await cancelResponse.json();
    expect(cancelBody?.success).toBe(true);
    expect(cancelBody?.message).toBe('Order cancelled: Buyer changed pickup plan');
    expect(cancelBody?.data?.status).toBe('CANCELLED');
  } finally {
    await deleteProductListing(request, seller.token, listing._id);
  }
});
