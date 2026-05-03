import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:5000/api';

export const options = {
  vus: 2,
  duration: '10s',
};

function registerRegularUser(name) {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = http.post(
    `${baseUrl}/auth/register`,
    JSON.stringify({
      name,
      email: `product-order-k6-${unique}@example.com`,
      password: 'password123',
      phone: '+94770000000',
      age: 25,
      address: {
        city: 'Colombo',
        country: 'Sri Lanka',
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  check(response, {
    'register user returns 201': (r) => r.status === 201,
    'register user returns token': (r) => Boolean(r.json('token')),
  });

  if (response.status !== 201) {
    throw new Error(`Failed to register ${name}: ${response.status} ${response.body}`);
  }

  return {
    id: response.json('user.id'),
    token: response.json('token'),
  };
}

function getActiveProductCategory() {
  const response = http.get(
    `${baseUrl}/categories?type=PRODUCT&isActive=true&page=1&limit=20`,
  );

  check(response, {
    'categories request returns 200': (r) => r.status === 200,
  });

  if (response.status !== 200) {
    throw new Error(`Failed to load categories: ${response.status} ${response.body}`);
  }

  const categories = response.json('data') || [];
  return categories.find((category) => category.type === 'PRODUCT' && category.isActive);
}

function attributeValueFor(attribute) {
  if (attribute.fieldType === 'select') return attribute.options?.[0] || 'Other';
  if (attribute.fieldType === 'number') return 1;
  if (attribute.fieldType === 'boolean') return true;
  return `Test ${attribute.fieldName}`;
}

function createBuyNowProductListing(token) {
  const category = getActiveProductCategory();

  if (!category) {
    throw new Error('No active PRODUCT category is available for product order performance setup.');
  }

  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = http.post(
    `${baseUrl}/listings`,
    JSON.stringify({
      title: `k6 order product ${unique}`,
      description: 'A focused product listing created for k6 order performance setup.',
      categoryId: category._id,
      price: 1250,
      currency: 'LKR',
      condition: 'USED_GOOD',
      transactionMode: 'BUY_NOW',
      isNegotiable: false,
      images: ['https://example.com/product-order-k6.jpg'],
      location: {
        city: 'Colombo',
        address: 'k6 pickup address',
        coordinates: {
          type: 'Point',
          coordinates: [79.8612, 6.9271],
        },
      },
      tags: ['k6', 'product-order'],
      attributes: Object.fromEntries(
        (category.attributes || []).map((attribute) => [
          attribute.fieldName,
          attributeValueFor(attribute),
        ]),
      ),
    }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  check(response, {
    'create listing returns 201': (r) => r.status === 201,
    'create listing returns active BUY_NOW listing': (r) =>
      r.json('data.transactionMode') === 'BUY_NOW' && r.json('data.status') === 'ACTIVE',
  });

  if (response.status !== 201) {
    throw new Error(`Failed to create listing: ${response.status} ${response.body}`);
  }

  return response.json('data');
}

function createPendingOrder(buyerToken, listingId) {
  const response = http.post(
    `${baseUrl}/orders`,
    JSON.stringify({
      listingId,
      quantity: 1,
      deliveryMethod: 'PICKUP',
      note: 'Local k6 performance setup order.',
    }),
    {
      headers: {
        Authorization: `Bearer ${buyerToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  check(response, {
    'create order returns 201': (r) => r.status === 201,
    'create order returns pending order': (r) =>
      r.json('data.order.status') === 'PENDING' && Boolean(r.json('data.order._id') || r.json('data.order.id')),
  });

  if (response.status !== 201) {
    throw new Error(`Failed to create order: ${response.status} ${response.body}`);
  }

  const order = response.json('data.order');
  return {
    id: order.id || order._id,
  };
}

function cancelPendingOrder(buyerToken, orderId) {
  if (!orderId) return;

  http.patch(
    `${baseUrl}/orders/${orderId}/cancel`,
    JSON.stringify({
      reason: 'Cleaning up k6 order performance setup',
    }),
    {
      headers: {
        Authorization: `Bearer ${buyerToken}`,
        'Content-Type': 'application/json',
      },
    },
  );
}

function deleteProductListing(sellerToken, listingId) {
  if (!listingId) return;

  http.del(`${baseUrl}/listings/${listingId}`, null, {
    headers: {
      Authorization: `Bearer ${sellerToken}`,
    },
  });
}

export function setup() {
  const seller = registerRegularUser('k6 Product Order Seller');
  const buyer = registerRegularUser('k6 Product Order Buyer');
  const listing = createBuyNowProductListing(seller.token);
  const order = createPendingOrder(buyer.token, listing._id);

  return {
    buyerToken: buyer.token,
    orderId: order.id,
    listingId: listing._id,
    sellerToken: seller.token,
  };
}

export default function (data) {
  const response = http.get(`${baseUrl}/orders/${data.orderId}`, {
    headers: {
      Authorization: `Bearer ${data.buyerToken}`,
    },
  });

  check(response, {
    'get order returns 200': (r) => r.status === 200,
    'get order returns expected order id': (r) =>
      (r.json('data.order.id') || r.json('data.order._id')) === data.orderId,
    'get order returns allowed actions': (r) => Array.isArray(r.json('data.actionsAllowed')),
  });

  sleep(1);
}

export function teardown(data) {
  cancelPendingOrder(data.buyerToken, data.orderId);
  deleteProductListing(data.sellerToken, data.listingId);
}
