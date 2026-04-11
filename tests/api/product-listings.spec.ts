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

type ListingSummary = {
  _id: string;
  ownerId: string | { _id?: string; id?: string; name?: string; email?: string; phone?: string };
  type: 'PRODUCT';
  transactionMode: 'BUY_NOW' | 'NEGOTIABLE';
  title: string;
  description: string;
  categoryId: string | { _id?: string; name?: string; type?: 'PRODUCT' | 'SERVICE' };
  attributes: Record<string, unknown>;
  price: number;
  currency: string;
  isNegotiable: boolean;
  condition: 'NEW' | 'USED_LIKE_NEW' | 'USED_GOOD' | 'USED_FAIR';
  images: string[];
  location: {
    city: string;
    address?: string;
    coordinates: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  status: 'ACTIVE' | 'SOLD' | 'HIDDEN' | 'DELETED' | 'SUSPENDED' | 'UNDER_REVIEW';
  tags: string[];
  viewsCount: number;
  savedCount: number;
  isWishlisted?: boolean;
  createdAt: string;
  updatedAt: string;
};

type ListingsResponse = {
  success: boolean;
  data: ListingSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const expectListingShape = (listing: ListingSummary) => {
  expect(listing._id).toEqual(expect.any(String));
  expect(listing.type).toBe('PRODUCT');
  expect(['BUY_NOW', 'NEGOTIABLE']).toContain(listing.transactionMode);
  expect(listing.title).toEqual(expect.any(String));
  expect(listing.description).toEqual(expect.any(String));
  expect(listing.attributes).toEqual(expect.any(Object));
  expect(listing.price).toEqual(expect.any(Number));
  expect(listing.currency).toEqual(expect.any(String));
  expect(listing.isNegotiable).toEqual(expect.any(Boolean));
  expect(['NEW', 'USED_LIKE_NEW', 'USED_GOOD', 'USED_FAIR']).toContain(listing.condition);
  expect(Array.isArray(listing.images)).toBe(true);
  expect(listing.location?.city).toEqual(expect.any(String));
  expect(listing.location?.coordinates?.type).toBe('Point');
  expect(listing.location?.coordinates?.coordinates).toHaveLength(2);
  expect(['ACTIVE', 'SOLD', 'HIDDEN', 'DELETED', 'SUSPENDED', 'UNDER_REVIEW']).toContain(listing.status);
  expect(Array.isArray(listing.tags)).toBe(true);
  expect(listing.viewsCount).toEqual(expect.any(Number));
  expect(listing.savedCount).toEqual(expect.any(Number));
  expect(listing.createdAt).toEqual(expect.any(String));
  expect(listing.updatedAt).toEqual(expect.any(String));
};

const registerRegularUser = async (request: APIRequestContext, name = 'Product Listing Test User') => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      name,
      email: `product-listing-test-${unique}@example.com`,
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

  return body.token as string;
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

const listingPayloadFor = (category: ProductCategory, unique: string) => ({
  title: `Playwright product listing ${unique}`,
  description: 'A focused product listing created by Playwright API tests.',
  categoryId: category._id,
  price: 1250,
  currency: 'LKR',
  condition: 'USED_GOOD',
  transactionMode: 'BUY_NOW',
  isNegotiable: false,
  images: ['https://example.com/product-listing-test.jpg'],
  location: {
    city: 'Colombo',
    address: 'Playwright test address',
    coordinates: {
      type: 'Point',
      coordinates: [79.8612, 6.9271],
    },
  },
  tags: ['playwright', 'product-listing'],
  attributes: Object.fromEntries(category.attributes.map((attribute) => [
    attribute.fieldName,
    attributeValueFor(attribute),
  ])),
});

const createProductListing = async (request: APIRequestContext, token: string) => {
  const category = await getActiveProductCategory(request);

  if (!category) {
    test.skip(true, 'No active PRODUCT category is available for listing creation.');
    throw new Error('Skipped: no active PRODUCT category');
  }

  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await request.post(`${API_BASE_URL}/listings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: listingPayloadFor(category, unique),
  });

  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body?.success).toBe(true);
  expectListingShape(body.data);
  expect(body.data.title).toBe(`Playwright product listing ${unique}`);
  expect(body.data.categoryId?._id).toBe(category._id);

  return body.data as ListingSummary;
};

const deleteProductListing = async (request: APIRequestContext, token: string, listingId: string) => {
  const response = await request.delete(`${API_BASE_URL}/listings/${listingId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(200);
};

test('public product listings endpoint returns paginated product listings', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/listings`, {
    params: {
      page: 1,
      limit: 5,
    },
  });

  expect(response.status()).toBe(200);

  const body = (await response.json()) as ListingsResponse;

  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.pagination).toEqual({
    page: 1,
    limit: 5,
    total: expect.any(Number),
    totalPages: expect.any(Number),
  });
  expect(body.data.length).toBeLessThanOrEqual(5);

  for (const listing of body.data) {
    expectListingShape(listing);
    expect(listing.status).toBe('ACTIVE');
  }
});

test('public product listings endpoint rejects an invalid price range', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/listings`, {
    params: {
      minPrice: 5000,
      maxPrice: 1000,
    },
  });

  expect(response.status()).toBe(400);

  const body = await response.json();
  expect(body?.message).toBe('Validation error');
  expect(Array.isArray(body?.errors)).toBe(true);
});

test('authenticated user can create a product listing and public detail endpoint returns it', async ({ request }) => {
  const token = await registerRegularUser(request);
  const createdListing = await createProductListing(request, token);

  try {
    const detailResponse = await request.get(`${API_BASE_URL}/listings/${createdListing._id}`);

    expect(detailResponse.status()).toBe(200);

    const detailBody = await detailResponse.json();
    expect(detailBody?.success).toBe(true);
    expectListingShape(detailBody.data);
    expect(detailBody.data._id).toBe(createdListing._id);
    expect(detailBody.data.title).toBe(createdListing.title);
    expect(detailBody.data.status).toBe('ACTIVE');
    expect(detailBody.data.isWishlisted).toBe(false);
  } finally {
    await deleteProductListing(request, token, createdListing._id);
  }
});

test('non-owner regular user cannot update another user product listing', async ({ request }) => {
  const ownerToken = await registerRegularUser(request, 'Product Listing Owner');
  const otherUserToken = await registerRegularUser(request, 'Product Listing Non Owner');
  const createdListing = await createProductListing(request, ownerToken);

  try {
    const response = await request.put(`${API_BASE_URL}/listings/${createdListing._id}`, {
      headers: {
        Authorization: `Bearer ${otherUserToken}`,
      },
      data: {
        title: 'Unauthorized product listing update',
      },
    });

    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body?.message).toBe('Forbidden');
  } finally {
    await deleteProductListing(request, ownerToken, createdListing._id);
  }
});
