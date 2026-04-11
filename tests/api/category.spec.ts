import { test, expect, type APIRequestContext } from '@playwright/test';

const API_BASE_URL = 'http://localhost:5000/api';

interface CategoryAttribute {
  fieldName: string;
  fieldType: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  options?: string[];
}

interface CategoryResponse {
  _id: string;
  name: string;
  type: 'PRODUCT' | 'SERVICE';
  description?: string;
  image?: string;
  attributes: CategoryAttribute[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoryListResponse {
  data: CategoryResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const expectCategoryShape = (category: CategoryResponse) => {
  expect(category._id).toEqual(expect.any(String));
  expect(category.name).toEqual(expect.any(String));
  expect(['PRODUCT', 'SERVICE']).toContain(category.type);
  if (category.image !== undefined) {
    expect(category.image).toEqual(expect.any(String));
  }
  expect(Array.isArray(category.attributes)).toBe(true);
  expect(category.isActive).toEqual(expect.any(Boolean));
  expect(category.createdAt).toEqual(expect.any(String));
  expect(category.updatedAt).toEqual(expect.any(String));

  for (const attribute of category.attributes) {
    expect(attribute.fieldName).toEqual(expect.any(String));
    expect(['string', 'number', 'boolean', 'select']).toContain(attribute.fieldType);
    expect(attribute.required).toEqual(expect.any(Boolean));
    if (attribute.options !== undefined) {
      expect(Array.isArray(attribute.options)).toBe(true);
    }
  }
};

const registerRegularUser = async (request: APIRequestContext) => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      name: 'Category Test User',
      email: `category-test-${unique}@example.com`,
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

test('get categories API works', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/categories`, {
    params: {
      page: 1,
      limit: 5,
    },
  });

  expect(response.status()).toBe(200);

  const body = (await response.json()) as CategoryListResponse;

  expect(Array.isArray(body.data)).toBe(true);
  expect(body.pagination).toEqual({
    page: 1,
    limit: 5,
    total: expect.any(Number),
    totalPages: expect.any(Number),
  });
  expect(body.data.length).toBeLessThanOrEqual(5);

  for (const category of body.data) {
    expectCategoryShape(category);
  }
});

test('get categories API fails validation for an invalid type filter', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/categories`, {
    params: {
      type: 'INVALID',
    },
  });

  expect(response.status()).toBe(400);

  const body = await response.json();
  expect(body?.message).toBe('Validation error');
  expect(Array.isArray(body?.errors)).toBe(true);
});

test('regular users cannot create categories', async ({ request }) => {
  const token = await registerRegularUser(request);

  const response = await request.post(`${API_BASE_URL}/categories`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      name: `Regular User Category ${Date.now()}`,
      type: 'PRODUCT',
      description: 'This category should not be created by a regular user.',
      image: 'https://example.com/category.png',
      attributes: [],
      isActive: true,
    },
  });

  expect(response.status()).toBe(403);

  const body = await response.json();
  expect(body?.message).toBe('Forbidden');
});
