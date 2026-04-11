import { test, expect, type APIRequestContext } from '@playwright/test';

const API_BASE_URL = 'http://localhost:5000/api';

type CategoryAttribute = {
  fieldName: string;
  fieldType: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  options?: string[];
};

type ServiceCategory = {
  _id: string;
  name: string;
  type: 'PRODUCT' | 'SERVICE';
  attributes: CategoryAttribute[];
  isActive: boolean;
};

type ServiceListing = {
  _id: string;
  sellerId: string | { _id?: string; id?: string; name?: string; email?: string; phone?: string };
  title: string;
  description?: string;
  categoryId: string | { _id?: string; name?: string; type?: 'PRODUCT' | 'SERVICE'; image?: string };
  price: number;
  pricingType: 'FIXED' | 'HOURLY';
  locationText: string;
  location?: {
    city?: string;
    address?: string;
    coordinates?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  images: string[];
  displayImage?: string;
  viewsCount: number;
  attributeValues: Record<string, unknown>;
  status: 'ACTIVE' | 'REMOVED' | 'DELETED';
  isActive: boolean;
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
};

type ServiceListingsResponse = {
  success: boolean;
  data: ServiceListing[];
};

const expectServiceListingShape = (service: ServiceListing) => {
  expect(service._id).toEqual(expect.any(String));
  expect(service.title).toEqual(expect.any(String));
  expect(service.categoryId).toBeTruthy();
  expect(service.price).toEqual(expect.any(Number));
  expect(['FIXED', 'HOURLY']).toContain(service.pricingType);
  expect(service.locationText).toEqual(expect.any(String));
  if (service.location?.city !== undefined) {
    expect(service.location.city).toEqual(expect.any(String));
  }
  if (service.location?.coordinates !== undefined) {
    expect(service.location.coordinates.type).toBe('Point');
    expect(service.location.coordinates.coordinates).toHaveLength(2);
  }
  expect(Array.isArray(service.images)).toBe(true);
  if (service.displayImage !== undefined) {
    expect(service.displayImage).toEqual(expect.any(String));
  }
  expect(service.viewsCount).toEqual(expect.any(Number));
  expect(service.attributeValues).toEqual(expect.any(Object));
  expect(['ACTIVE', 'REMOVED', 'DELETED']).toContain(service.status);
  expect(service.isActive).toEqual(expect.any(Boolean));
  if (service.averageRating !== undefined) {
    expect(service.averageRating).toEqual(expect.any(Number));
  }
  if (service.reviewCount !== undefined) {
    expect(service.reviewCount).toEqual(expect.any(Number));
  }
  expect(service.createdAt).toEqual(expect.any(String));
  expect(service.updatedAt).toEqual(expect.any(String));
};

const registerRegularUser = async (request: APIRequestContext, name = 'Service Listing Test User') => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      name,
      email: `service-listing-test-${unique}@example.com`,
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

const getActiveServiceCategory = async (request: APIRequestContext) => {
  const response = await request.get(`${API_BASE_URL}/categories`, {
    params: {
      type: 'SERVICE',
      isActive: 'true',
      page: 1,
      limit: 20,
    },
  });

  expect(response.status()).toBe(200);

  const body = (await response.json()) as { data: ServiceCategory[] };
  return body.data.find((category) => category.type === 'SERVICE' && category.isActive);
};

const attributeValueFor = (attribute: CategoryAttribute) => {
  if (attribute.fieldType === 'select') return attribute.options?.[0] ?? 'Other';
  if (attribute.fieldType === 'number') return 1;
  if (attribute.fieldType === 'boolean') return true;
  return `Test ${attribute.fieldName}`;
};

const serviceListingPayloadFor = (category: ServiceCategory, unique: string) => ({
  title: `Playwright service listing ${unique}`,
  description: 'A focused service listing created by Playwright API tests.',
  categoryId: category._id,
  price: 1500,
  pricingType: 'FIXED',
  locationText: 'Colombo',
  location: {
    city: 'Colombo',
    address: 'Playwright service test address',
    coordinates: {
      type: 'Point',
      coordinates: [79.8612, 6.9271],
    },
  },
  images: ['https://example.com/service-listing-test.jpg'],
  attributeValues: Object.fromEntries(category.attributes.map((attribute) => [
    attribute.fieldName,
    attributeValueFor(attribute),
  ])),
});

const createServiceListing = async (request: APIRequestContext, token: string) => {
  const category = await getActiveServiceCategory(request);

  if (!category) {
    test.skip(true, 'No active SERVICE category is available for service listing creation.');
    throw new Error('Skipped: no active SERVICE category');
  }

  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await request.post(`${API_BASE_URL}/serviceselling`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: serviceListingPayloadFor(category, unique),
  });

  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body?.success).toBe(true);
  expectServiceListingShape(body.data);
  expect(body.data.title).toBe(`Playwright service listing ${unique}`);
  expect(body.data.categoryId).toBe(category._id);

  return body.data as ServiceListing;
};

const deleteServiceListing = async (request: APIRequestContext, token: string, serviceId: string) => {
  const response = await request.delete(`${API_BASE_URL}/serviceselling/${serviceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(200);
};

test('public service listings endpoint returns active service listings', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/serviceselling`, {
    params: {
      page: 1,
      limit: 5,
    },
  });

  expect(response.status()).toBe(200);

  const body = (await response.json()) as ServiceListingsResponse;

  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.data.length).toBeLessThanOrEqual(5);

  for (const service of body.data) {
    expectServiceListingShape(service);
    expect(service.status).toBe('ACTIVE');
    expect(service.isActive).toBe(true);
    expect(service.description).toBeUndefined();
  }
});

test('public service listings endpoint rejects an invalid pricing type filter', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/serviceselling`, {
    params: {
      pricingType: 'INVALID',
    },
  });

  expect(response.status()).toBe(400);

  const body = await response.json();
  expect(body?.message).toBe('Validation error');
  expect(Array.isArray(body?.errors)).toBe(true);
});

test('authenticated user can create a service listing and public detail endpoint returns it', async ({ request }) => {
  const token = await registerRegularUser(request);
  const createdService = await createServiceListing(request, token);

  try {
    const detailResponse = await request.get(`${API_BASE_URL}/serviceselling/${createdService._id}`);

    expect(detailResponse.status()).toBe(200);

    const detailBody = await detailResponse.json();
    expect(detailBody?.success).toBe(true);
    expectServiceListingShape(detailBody.data);
    expect(detailBody.data._id).toBe(createdService._id);
    expect(detailBody.data.title).toBe(createdService.title);
    expect(detailBody.data.description).toBe('A focused service listing created by Playwright API tests.');
    expect(detailBody.data.status).toBe('ACTIVE');
    expect(detailBody.data.isActive).toBe(true);
    expect(detailBody.data.categoryId?._id).toBe(createdService.categoryId);
  } finally {
    await deleteServiceListing(request, token, createdService._id);
  }
});

test('non-owner regular user cannot update another user service listing', async ({ request }) => {
  const ownerToken = await registerRegularUser(request, 'Service Listing Owner');
  const otherUserToken = await registerRegularUser(request, 'Service Listing Non Owner');
  const createdService = await createServiceListing(request, ownerToken);

  try {
    const response = await request.put(`${API_BASE_URL}/serviceselling/${createdService._id}`, {
      headers: {
        Authorization: `Bearer ${otherUserToken}`,
      },
      data: {
        title: 'Unauthorized service listing update',
      },
    });

    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body?.message).toBe('Forbidden');
  } finally {
    await deleteServiceListing(request, ownerToken, createdService._id);
  }
});
