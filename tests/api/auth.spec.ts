import { test, expect } from '@playwright/test';

test('login API fails with invalid credentials', async ({ request }) => {
  const response = await request.post('http://localhost:5000/api/auth/login', {
    data: {
      email: 'not-a-real-user@example.com',
      password: 'wrong-password-123',
    },
  });

  expect(response.status()).toBe(401);

  const data = await response.json();
  expect(data?.message).toBe('Invalid credentials');
});

test('register API fails validation with missing required fields', async ({ request }) => {
  const response = await request.post('http://localhost:5000/api/auth/register', {
    data: {},
  });

  expect(response.status()).toBe(400);

  const data = await response.json();
  expect(data?.message).toBe('Validation error');
  expect(Array.isArray(data?.errors)).toBe(true);
});
