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

type RegisteredUser = {
  id: string;
  token: string;
};

type ServiceListing = {
  _id: string;
  sellerId: string | { _id?: string; id?: string };
  title: string;
  price: number;
  pricingType: 'FIXED' | 'HOURLY';
  status: 'ACTIVE' | 'REMOVED' | 'DELETED';
  isActive: boolean;
};

type ServiceBooking = {
  _id: string;
  serviceId: string | { _id?: string; id?: string; title?: string };
  buyerId: string | { _id?: string; id?: string; name?: string; email?: string };
  providerId: string | { _id?: string; id?: string; name?: string; email?: string };
  startAt: string;
  endAt: string;
  durationMinutes: number;
  note?: string;
  status: 'PENDING' | 'PROVIDER_ACCEPTED' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  isSlotTaken?: boolean;
};

const entityId = (value: string | { _id?: string; id?: string } | undefined) => {
  if (!value) return undefined;
  return typeof value === 'string' ? value : value._id ?? value.id;
};

const registerRegularUser = async (
  request: APIRequestContext,
  name = 'Service Booking Test User',
): Promise<RegisteredUser> => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      name,
      email: `service-booking-test-${unique}@example.com`,
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
  title: `Playwright booking service ${unique}`,
  description: 'A focused service listing created for Playwright booking tests.',
  categoryId: category._id,
  price: 1500,
  pricingType: 'FIXED',
  locationText: 'Colombo',
  location: {
    city: 'Colombo',
    address: 'Playwright service booking address',
    coordinates: {
      type: 'Point',
      coordinates: [79.8612, 6.9271],
    },
  },
  images: ['https://example.com/service-booking-test.jpg'],
  attributeValues: Object.fromEntries((category.attributes ?? []).map((attribute) => [
    attribute.fieldName,
    attributeValueFor(attribute),
  ])),
});

const createServiceListing = async (
  request: APIRequestContext,
  token: string,
) => {
  const category = await getActiveServiceCategory(request);

  if (!category) {
    test.skip(true, 'No active SERVICE category is available for service booking tests.');
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
  expect(body.data?._id).toEqual(expect.any(String));
  expect(body.data?.title).toBe(`Playwright booking service ${unique}`);
  expect(body.data?.status).toBe('ACTIVE');
  expect(body.data?.isActive).toBe(true);

  return body.data as ServiceListing;
};

const deleteServiceListing = async (
  request: APIRequestContext,
  token: string,
  serviceId: string,
) => {
  const response = await request.delete(`${API_BASE_URL}/serviceselling/${serviceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status()).toBe(200);
};

const cancelBooking = async (
  request: APIRequestContext,
  token: string,
  bookingId: string | undefined,
) => {
  if (!bookingId) return;

  try {
    await request.patch(`${API_BASE_URL}/servicebookings/${bookingId}/cancel`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Best-effort cleanup only. The assertions belong to the test body.
  }
};

const bookingStartIso = () => {
  const startAt = new Date();
  startAt.setUTCDate(startAt.getUTCDate() + 14);
  startAt.setUTCHours(10, 0, 0, 0);
  return startAt.toISOString();
};

const expectBookingShape = (booking: ServiceBooking) => {
  expect(booking._id).toEqual(expect.any(String));
  expect(entityId(booking.serviceId)).toEqual(expect.any(String));
  expect(entityId(booking.buyerId)).toEqual(expect.any(String));
  expect(entityId(booking.providerId)).toEqual(expect.any(String));
  expect(booking.startAt).toEqual(expect.any(String));
  expect(booking.endAt).toEqual(expect.any(String));
  expect(booking.durationMinutes).toEqual(expect.any(Number));
  expect(['PENDING', 'PROVIDER_ACCEPTED', 'CONFIRMED', 'REJECTED', 'CANCELLED']).toContain(booking.status);
  expect(booking.createdAt).toEqual(expect.any(String));
  expect(booking.updatedAt).toEqual(expect.any(String));
  if (booking.isSlotTaken !== undefined) {
    expect(booking.isSlotTaken).toEqual(expect.any(Boolean));
  }
};

test('buyer can create a pending service booking for another user service listing', async ({ request }) => {
  const provider = await registerRegularUser(request, 'Service Booking Provider');
  const buyer = await registerRegularUser(request, 'Service Booking Buyer');
  const service = await createServiceListing(request, provider.token);
  let createdBookingId: string | undefined;

  try {
    const startAt = bookingStartIso();
    const response = await request.post(`${API_BASE_URL}/servicebookings`, {
      headers: {
        Authorization: `Bearer ${buyer.token}`,
      },
      data: {
        serviceId: service._id,
        startAt,
        durationMinutes: 60,
        note: 'Please confirm the test appointment window.',
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body?.success).toBe(true);

    const booking = body.data as ServiceBooking;
    createdBookingId = booking._id;
    expectBookingShape(booking);
    expect(entityId(booking.serviceId)).toBe(service._id);
    expect(entityId(booking.buyerId)).toBe(buyer.id);
    expect(entityId(booking.providerId)).toBe(provider.id);
    expect(booking.startAt).toBe(startAt);
    expect(booking.durationMinutes).toBe(60);
    expect(booking.note).toBe('Please confirm the test appointment window.');
    expect(booking.status).toBe('PENDING');

    const myBookingsResponse = await request.get(`${API_BASE_URL}/servicebookings/me`, {
      headers: {
        Authorization: `Bearer ${buyer.token}`,
      },
      params: {
        status: 'PENDING',
      },
    });

    expect(myBookingsResponse.status()).toBe(200);

    const myBookingsBody = await myBookingsResponse.json();
    expect(myBookingsBody?.success).toBe(true);
    expect(Array.isArray(myBookingsBody?.data)).toBe(true);

    const listedBooking = (myBookingsBody.data as ServiceBooking[]).find((item) => item._id === createdBookingId);
    expect(listedBooking).toBeTruthy();
    expect(listedBooking?.status).toBe('PENDING');
  } finally {
    await cancelBooking(request, buyer.token, createdBookingId);
    await deleteServiceListing(request, provider.token, service._id);
  }
});

test('provider can accept a pending service booking', async ({ request }) => {
  const provider = await registerRegularUser(request, 'Service Booking Accept Provider');
  const buyer = await registerRegularUser(request, 'Service Booking Accept Buyer');
  const service = await createServiceListing(request, provider.token);
  let createdBookingId: string | undefined;

  try {
    const createResponse = await request.post(`${API_BASE_URL}/servicebookings`, {
      headers: {
        Authorization: `Bearer ${buyer.token}`,
      },
      data: {
        serviceId: service._id,
        startAt: bookingStartIso(),
        durationMinutes: 45,
      },
    });

    expect(createResponse.status()).toBe(201);

    const createBody = await createResponse.json();
    const createdBooking = createBody.data as ServiceBooking;
    createdBookingId = createdBooking._id;
    expect(createdBooking.status).toBe('PENDING');

    const decisionResponse = await request.patch(`${API_BASE_URL}/servicebookings/${createdBookingId}/decision`, {
      headers: {
        Authorization: `Bearer ${provider.token}`,
      },
      data: {
        action: 'ACCEPT',
      },
    });

    expect(decisionResponse.status()).toBe(200);

    const decisionBody = await decisionResponse.json();
    expect(decisionBody?.success).toBe(true);

    const acceptedBooking = decisionBody.data as ServiceBooking;
    expectBookingShape(acceptedBooking);
    expect(acceptedBooking._id).toBe(createdBookingId);
    expect(entityId(acceptedBooking.serviceId)).toBe(service._id);
    expect(entityId(acceptedBooking.buyerId)).toBe(buyer.id);
    expect(entityId(acceptedBooking.providerId)).toBe(provider.id);
    expect(acceptedBooking.status).toBe('PROVIDER_ACCEPTED');

    const providerBookingsResponse = await request.get(`${API_BASE_URL}/servicebookings/provider/me`, {
      headers: {
        Authorization: `Bearer ${provider.token}`,
      },
      params: {
        status: 'PROVIDER_ACCEPTED',
      },
    });

    expect(providerBookingsResponse.status()).toBe(200);

    const providerBookingsBody = await providerBookingsResponse.json();
    expect(providerBookingsBody?.success).toBe(true);
    expect(Array.isArray(providerBookingsBody?.data)).toBe(true);

    const listedBooking = (providerBookingsBody.data as ServiceBooking[]).find((item) => item._id === createdBookingId);
    expect(listedBooking).toBeTruthy();
    expect(listedBooking?.status).toBe('PROVIDER_ACCEPTED');
  } finally {
    await cancelBooking(request, buyer.token, createdBookingId);
    await deleteServiceListing(request, provider.token, service._id);
  }
});

test('provider can reject a pending service booking', async ({ request }) => {
  const provider = await registerRegularUser(request, 'Service Booking Reject Provider');
  const buyer = await registerRegularUser(request, 'Service Booking Reject Buyer');
  const service = await createServiceListing(request, provider.token);
  let createdBookingId: string | undefined;

  try {
    const createResponse = await request.post(`${API_BASE_URL}/servicebookings`, {
      headers: {
        Authorization: `Bearer ${buyer.token}`,
      },
      data: {
        serviceId: service._id,
        startAt: bookingStartIso(),
        durationMinutes: 45,
      },
    });

    expect(createResponse.status()).toBe(201);

    const createBody = await createResponse.json();
    const createdBooking = createBody.data as ServiceBooking;
    createdBookingId = createdBooking._id;
    expect(createdBooking.status).toBe('PENDING');

    const decisionResponse = await request.patch(`${API_BASE_URL}/servicebookings/${createdBookingId}/decision`, {
      headers: {
        Authorization: `Bearer ${provider.token}`,
      },
      data: {
        action: 'REJECT',
      },
    });

    expect(decisionResponse.status()).toBe(200);

    const decisionBody = await decisionResponse.json();
    expect(decisionBody?.success).toBe(true);

    const rejectedBooking = decisionBody.data as ServiceBooking;
    expectBookingShape(rejectedBooking);
    expect(rejectedBooking._id).toBe(createdBookingId);
    expect(entityId(rejectedBooking.serviceId)).toBe(service._id);
    expect(entityId(rejectedBooking.buyerId)).toBe(buyer.id);
    expect(entityId(rejectedBooking.providerId)).toBe(provider.id);
    expect(rejectedBooking.status).toBe('REJECTED');

    const providerBookingsResponse = await request.get(`${API_BASE_URL}/servicebookings/provider/me`, {
      headers: {
        Authorization: `Bearer ${provider.token}`,
      },
      params: {
        status: 'REJECTED',
      },
    });

    expect(providerBookingsResponse.status()).toBe(200);

    const providerBookingsBody = await providerBookingsResponse.json();
    expect(providerBookingsBody?.success).toBe(true);
    expect(Array.isArray(providerBookingsBody?.data)).toBe(true);

    const listedBooking = (providerBookingsBody.data as ServiceBooking[]).find((item) => item._id === createdBookingId);
    expect(listedBooking).toBeTruthy();
    expect(listedBooking?.status).toBe('REJECTED');
  } finally {
    await cancelBooking(request, buyer.token, createdBookingId);
    await deleteServiceListing(request, provider.token, service._id);
  }
});
