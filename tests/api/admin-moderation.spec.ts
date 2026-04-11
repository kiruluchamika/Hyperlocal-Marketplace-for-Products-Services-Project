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
  type: 'PRODUCT' | 'SERVICE';
  attributes: CategoryAttribute[];
  isActive: boolean;
};

type ProductListing = {
  _id: string;
  title: string;
  status: 'ACTIVE' | 'SOLD' | 'HIDDEN' | 'DELETED' | 'SUSPENDED' | 'UNDER_REVIEW';
};

const registerRegularUser = async (request: APIRequestContext, name = 'Admin Moderation Test User') => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      name,
      email: `admin-moderation-test-${unique}@example.com`,
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
  expect(body?.user?.role).toBe('user');
  expect(body?.token).toEqual(expect.any(String));

  return {
    email: body.user.email as string,
    password: 'password123',
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

const createProductListing = async (request: APIRequestContext, token: string) => {
  const category = await getActiveProductCategory(request);

  if (!category) {
    test.skip(true, 'No active PRODUCT category is available for admin moderation tests.');
    throw new Error('Skipped: no active PRODUCT category');
  }

  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await request.post(`${API_BASE_URL}/listings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      title: `Playwright admin moderation product ${unique}`,
      description: 'A focused product listing created for admin moderation API tests.',
      categoryId: category._id,
      price: 1250,
      currency: 'LKR',
      condition: 'USED_GOOD',
      transactionMode: 'BUY_NOW',
      isNegotiable: false,
      images: ['https://example.com/admin-moderation-product.jpg'],
      location: {
        city: 'Colombo',
        address: 'Playwright admin moderation test address',
        coordinates: {
          type: 'Point',
          coordinates: [79.8612, 6.9271],
        },
      },
      tags: ['playwright', 'admin-moderation'],
      attributes: Object.fromEntries(category.attributes.map((attribute) => [
        attribute.fieldName,
        attributeValueFor(attribute),
      ])),
    },
  });

  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body?.success).toBe(true);
  expect(body?.data?._id).toEqual(expect.any(String));
  expect(body?.data?.status).toBe('ACTIVE');

  return body.data as ProductListing;
};

const deleteProductListing = async (request: APIRequestContext, token: string, listingId: string) => {
  const response = await request.delete(`${API_BASE_URL}/listings/${listingId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(200);
};

test('admin stats endpoint requires authentication', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/admin/stats`);

  expect(response.status()).toBe(401);

  const body = await response.json();
  expect(body?.message).toBe('Authentication required');
});

test('regular users cannot authenticate through admin login or access admin listings', async ({ request }) => {
  const user = await registerRegularUser(request);

  const adminLoginResponse = await request.post(`${API_BASE_URL}/auth/admin/login`, {
    data: {
      email: user.email,
      password: user.password,
    },
  });

  expect(adminLoginResponse.status()).toBe(403);
  expect((await adminLoginResponse.json())?.message).toBe('Admin access required');

  const listingsResponse = await request.get(`${API_BASE_URL}/admin/listings`, {
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    params: {
      page: 1,
      limit: 5,
    },
  });

  expect(listingsResponse.status()).toBe(403);
  expect((await listingsResponse.json())?.message).toBe('Forbidden');
});

test('regular users cannot suspend a product listing through admin moderation', async ({ request }) => {
  const user = await registerRegularUser(request);
  const listing = await createProductListing(request, user.token);

  try {
    const suspendResponse = await request.patch(`${API_BASE_URL}/admin/listings/${listing._id}/suspend`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
      data: {
        reason: 'Playwright moderation protection check',
      },
    });

    expect(suspendResponse.status()).toBe(403);
    expect((await suspendResponse.json())?.message).toBe('Forbidden');

    const detailResponse = await request.get(`${API_BASE_URL}/listings/${listing._id}`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });

    expect(detailResponse.status()).toBe(200);

    const detailBody = await detailResponse.json();
    expect(detailBody?.data?.status).toBe('ACTIVE');
  } finally {
    await deleteProductListing(request, user.token, listing._id);
  }
});
