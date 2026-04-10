# Hyperlocal Marketplace for Products and Services

Classification: Public-SLIIT

Backend and frontend for a hyperlocal marketplace where users can discover nearby products and services, place orders, book services, pay securely, receive notifications, and manage listings.

## Table of Contents

1. [System Overview](#system-overview)
2. [User Flows (Simple View)](#user-flows-simple-view)
3. [Quick Start (5 Minutes)](#quick-start-5-minutes)
4. [Tech Stack](#tech-stack)
5. [Repository Structure](#repository-structure)
6. [Setup Instructions (Step-by-Step)](#setup-instructions-step-by-step)
7. [Environment Variables](#environment-variables)
8. [Run and Build Commands](#run-and-build-commands)
9. [API Documentation](#api-documentation)
10. [Endpoint Reference (Production Endpoints)](#endpoint-reference-production-endpoints)
11. [Request and Response Examples](#request-and-response-examples)
12. [Operational Notes](#operational-notes)
13. [Security and Validation](#security-and-validation)
14. [Troubleshooting](#troubleshooting)
15. [Documentation Maintenance](#documentation-maintenance)

## System Overview

This project provides:

- User authentication (email/password + Google social login)
- Product listing creation and browsing
- Service ad creation and booking flow
- Order lifecycle management with OTP-assisted delivery confirmation
- Stripe payment integration (orders + service booking deposits)
- Notifications (API + real-time socket integration)
- Review, report, and contact workflows
- Admin moderation and operational dashboards

Core backend entry files:

- `backend/src/app.ts`
- `backend/src/server.ts`

Core frontend entry files:

- `frontend/src/main.tsx`
- `frontend/src/routes/AppRouter.tsx`

## User Flows (Simple View)

- Buyer flow: Register/Login -> Browse listings -> Create order -> Pay -> Receive product -> Review.
- Seller flow: Create listing/service -> Accept order/booking -> Deliver/complete service -> Receive payout.
- Admin flow: Monitor users/listings/orders/payments/reports -> Moderate content -> Manage platform operations.

## Quick Start (5 Minutes)

1. Install dependencies:

```bash
cd backend
npm install
cd ../frontend
npm install
```

2. Create env files:

- `backend/.env` from `backend/.env.example`
- `frontend/.env` from `frontend/.env.example`

3. Start backend:

```bash
cd ../backend
npm run dev
```

4. Start frontend in a new terminal:

```bash
cd frontend
npm run dev
```

5. Open:

- Frontend: `http://localhost:5173`
- API docs: `http://localhost:5000/api-docs`

## Tech Stack

### Backend

- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT authentication
- Zod request validation
- Stripe payments
- Twilio Verify (OTP)
- Swagger (OpenAPI docs)
- Socket.IO notifications
- node-cron background jobs

### Frontend

- React + TypeScript + Vite
- React Router
- Axios
- Zustand
- Stripe React SDK
- Tailwind + Bootstrap (project includes both)

## Repository Structure

```text
backend/
  package.json
  .env.example
  src/
    app.ts
    server.ts
    config/
    controllers/
    middlewares/
    models/
    routes/
    services/
    validators/

frontend/
  package.json
  .env.example
  src/
    main.tsx
    App.tsx
    routes/
    pages/
    api/
```

## Setup Instructions (Step-by-Step)

### 1. Prerequisites

- Node.js (LTS recommended)
- npm
- MongoDB (Atlas or local)
- Stripe test account
- Google OAuth client ID
- Twilio Verify credentials (if OTP features enabled)

### 2. Clone Project

```bash
git clone <your-repository-url>
cd Hyperlocal-Marketplace-for-Products-Services-Project
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Configure Backend Environment

Create `backend/.env` from `backend/.env.example` and set real values.

Required core values:

- `PORT`
- `MONGODB_URI` (or fallback local URI)
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`

Optional integrations:

- Twilio OTP (`TWILIO_*`)
- SMTP (`SMTP_*`)

### 5. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 6. Configure Frontend Environment

Create `frontend/.env` from `frontend/.env.example`.

Set:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_STRIPE_PUBLISHABLE_KEY`

Important: `VITE_GOOGLE_CLIENT_ID` must match backend `GOOGLE_CLIENT_ID`.

### 7. Start Backend

```bash
cd ../backend
npm run dev
```

Backend default URL:

- `http://localhost:5000`

Swagger URLs:

- `http://localhost:5000/api-docs`
- `http://localhost:5000/swagger`
- `http://localhost:5000/docs`

### 8. Start Frontend

Open a new terminal:

```bash
cd ../frontend
npm run dev
```

Frontend default URL:

- `http://localhost:5173`

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d

STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_CONNECT_ENABLED=true

ENABLE_OTP_DELIVERY=true
OTP_EXPIRY_MINUTES=30

GOOGLE_CLIENT_ID=your_google_client_id

TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=...
```

### Frontend (`frontend/.env`)

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

## Run and Build Commands

### Backend

```bash
npm run dev
npm run build
npm start
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

## API Documentation

### Base URL

Development base URL:

`http://localhost:5000/api`

### Authentication

Protected endpoints require:

`Authorization: Bearer <jwt_token>`

### Authorization Patterns

- Public: no token required
- Authenticated: valid JWT required
- Role protected: `requireRole(["user"])` or `requireRole(["admin"])`

### Role and Access Matrix

| Feature Area | Public | Authenticated User | Admin |
|---|---|---|---|
| Auth endpoints | Yes | Yes | Yes |
| Browse listings/services/categories/geo | Yes | Yes | Yes |
| Create/update own listings and bookings | No | Yes | Yes |
| Orders and payments (own scope) | No | Yes | Yes |
| Reports, reviews, contact/my | No | Yes | Yes |
| Admin dashboard and moderation endpoints | No | No | Yes |

### Common Error Response

```json
{
  "message": "Human-readable error",
  "errors": {}
}
```

### Success Response Pattern

Success response shape varies by endpoint. Common patterns used in this project:

- `{ "user": { "id": "...", "email": "...", "role": "user" }, "token": "jwt_token" }`
- `{ "success": true, "data": { "id": "..." } }`
- `{ "message": "Operation completed successfully" }`

### Common Status Codes

- `200` Success
- `201` Created
- `400` Validation or business rule error
- `401` Unauthorized (missing/invalid token)
- `403` Forbidden (role/ownership restriction)
- `404` Not found
- `500` Internal server error

## Endpoint Reference (Production Endpoints)

Note: test-only endpoints are intentionally excluded from this table.

### 1) Auth (`/api/auth`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| POST | `/auth/register` | Public | Body: `name,email,password,phone,age,address` | `201 { user, token }` |
| POST | `/auth/login` | Public | Body: `email,password` | `200 { user, token }` |
| POST | `/auth/admin/login` | Public | Body: `email,password` | `200 { user, token }` |
| POST | `/auth/social/google` | Public | Body: `idToken` | `200 { user, token }` |

### 2) Users (`/api/users`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| GET | `/users/me` | Bearer | - | `200 { user }` |
| PATCH | `/users/me` | Bearer | Body: profile fields | `200 { user }` |
| PATCH | `/users/me/password` | Bearer | Body: password fields | `200 { message }` |
| POST | `/users/stripe-connect/onboarding` | Bearer | Body: onboarding options | `200 { url, accountId }` |
| GET | `/users/stripe-connect/status` | Bearer | - | `200 { accountId, onboardingStatus, chargesEnabled, payoutsEnabled }` |
| GET | `/users/stripe-connect/balance` | Bearer | - | `200 { available, pending, currency }` |
| GET | `/users` | Bearer + Admin | - | `200 { users }` |

### 3) Listings (`/api/listings`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| POST | `/listings` | Bearer | Body: listing payload | `201 { listing }` |
| GET | `/listings` | Public | Query: filters, pagination | `200 { listings, pagination }` |
| GET | `/listings/me` | Bearer | - | `200 { listings }` |
| GET | `/listings/wishlist` | Bearer | - | `200 { wishlist }` |
| POST | `/listings/:id/wishlist` | Bearer | Param: `id` | `200 { message }` |
| DELETE | `/listings/:id/wishlist` | Bearer | Param: `id` | `200 { message }` |
| GET | `/listings/:id` | Public (optional auth) | Param: `id` | `200 { listing }` |
| PUT | `/listings/:id` | Bearer + Owner/Admin | Param: `id`, Body: update payload | `200 { listing }` |
| DELETE | `/listings/:id` | Bearer + Owner/Admin | Param: `id` | `200 { message }` |

### 4) Categories (`/api/categories`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| POST | `/categories` | Bearer + Admin | Body: category payload | `201 { category }` |
| GET | `/categories` | Public | Query: `type,isActive,search,page,limit` | `200 { categories }` |
| GET | `/categories/:id` | Public | Param: `id` | `200 { category }` |
| PUT | `/categories/:id` | Bearer + Admin | Param: `id`, Body: update payload | `200 { category }` |
| DELETE | `/categories/:id` | Bearer + Admin | Param: `id` | `200 { message }` |

### 5) Geospatial Search (`/api/geo-search`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| GET | `/geo-search/search` | Public | Query: `latitude,longitude,radiusKm` | `200 { success, data, query }` |
| GET | `/geo-search/search-with-filters` | Public | Query: location + filters | `200 { success, data, query }` |

### 6) Orders (`/api/orders`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| POST | `/orders` | Bearer + User | Body: `listingId,quantity,deliveryMethod,deliveryAddress?,note?` | `201 { id, status, totalAmount, deliveryMethod }` |
| PATCH | `/orders/:id/cancel` | Bearer + User | Param: `id` | `200 { id, status }` |
| PATCH | `/orders/:id/confirm-received` | Bearer + User | Param: `id` | `200 { id, status }` |
| POST | `/orders/:id/confirm-received-otp` | Bearer + User | Param: `id`, Body: `otp` | `200 { id, status }` |
| PUT | `/orders/:id/delivery-details` | Bearer + User | Param: `id`, Body: delivery config | `200 { id, deliveryMethod, deliveryAddress }` |
| PATCH | `/orders/:id/accept` | Bearer + User | Param: `id` | `200 { id, status }` |
| PATCH | `/orders/:id/reject` | Bearer + User | Param: `id` | `200 { id, status }` |
| PATCH | `/orders/:id/start` | Bearer + User | Param: `id` | `200 { id, status }` |
| POST | `/orders/:id/confirm-delivery` | Bearer + User | Param: `id`, Body: `otp` | `400` deprecated flow |
| GET | `/orders` | Bearer + User/Admin | Query: `status,page,limit` | `200 { orders, pagination }` |
| GET | `/orders/:id` | Bearer + User/Admin | Param: `id` | `200 { id, buyerId, sellerId, status, totalAmount }` |
| DELETE | `/orders/:id` | Bearer + Admin | Param: `id`, Body: optional reason/refund | `200 { success, message, data }` |

### 7) Payments (`/api/payments`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| GET | `/payments/config` | Public | - | `200 { publishableKey }` |
| POST | `/payments/initiate` | Bearer + User | Body: `orderId` | `200 { paymentId, clientSecret, amount, currency }` |
| POST | `/payments/confirm` | Bearer + User | Body: `paymentId` | `200 { message, payment }` |
| POST | `/payments/webhook/stripe` | Public (signed) | Stripe webhook payload | `200 { received: true }` |
| GET | `/payments/order/:orderId` | Bearer + User/Admin | Param: `orderId` | `200 { payment }` |
| GET | `/payments/:id` | Bearer + User/Admin | Param: `id` | `200 { payment }` |

### 8) OTP (`/api/otp`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| POST | `/otp/send` | Public | Body: `phone,channel?` | `200 { sid,to,channel,status,valid,message }` |
| POST | `/otp/verify` | Public | Body: `phone,code` | `200 { sid,to,status,valid,message }` |

### 9) Notifications (`/api/notifications`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| GET | `/notifications` | Bearer | Query: `unreadOnly,page,limit` | `200 { notifications, pagination }` |
| GET | `/notifications/unread-count` | Bearer | - | `200 { unreadCount }` |
| PATCH | `/notifications/:id/read` | Bearer | Param: `id` | `200 { message, notification }` |
| PATCH | `/notifications/read-all` | Bearer | - | `200 { message, modifiedCount }` |

### 10) Service Selling (`/api/serviceselling`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| GET | `/serviceselling` | Public | Query: service filters | `200 { success, data }` |
| GET | `/serviceselling/me` | Bearer | - | `200 { success, data }` |
| GET | `/serviceselling/admin` | Bearer + Admin | Query: `status,search` | `200 { success, data }` |
| GET | `/serviceselling/:id` | Public (optional auth) | Param: `id` | `200 { success, data }` |
| POST | `/serviceselling` | Bearer + User | Body: service ad payload | `201 { success, data }` |
| PUT | `/serviceselling/:id` | Bearer + User + Owner/Admin | Param: `id`, Body: update payload | `200 { success, data }` |
| DELETE | `/serviceselling/:id` | Bearer + User + Owner/Admin | Param: `id` | `200 { success, message }` |
| PATCH | `/serviceselling/:id/moderate` | Bearer + Admin | Param: `id`, Body: `reason` | `200 { success, message, data }` |

### 11) Service Booking (`/api/servicebookings`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| POST | `/servicebookings` | Bearer + User | Body: `serviceId,startAt,durationMinutes,note?` | `201 { success, data }` |
| GET | `/servicebookings/me` | Bearer + User | Query: `status?` | `200 { success, data }` |
| GET | `/servicebookings/provider/me` | Bearer + User | Query: `status?` | `200 { success, data }` |
| GET | `/servicebookings/slots` | Public | Query: `serviceId,from?,to?` | `200 { success, data }` |
| PATCH | `/servicebookings/:id/cancel` | Bearer + User | Param: `id` | `200 { success, data }` |
| PATCH | `/servicebookings/:id/decision` | Bearer + User | Param: `id`, Body: `action` | `200 { success, data }` |
| POST | `/servicebookings/:id/deposit/initiate` | Bearer + User | Param: `id` | `200 { success, data }` |
| POST | `/servicebookings/:id/deposit/confirm` | Bearer + User | Param: `id`, Body: `paymentIntentId` | `200 { success, data }` |

### 12) Reports (`/api/reports`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| POST | `/reports` | Bearer | Body: report payload | `201 { report }` |
| GET | `/reports/me` | Bearer | Query: `page,limit` | `200 { reports, pagination }` |
| GET | `/reports/admin/list` | Bearer + Admin | Query: admin filters | `200 { reports, pagination }` |
| GET | `/reports/:id` | Bearer | Param: `id` | `200 { report }` |
| PATCH | `/reports/:id/resolve` | Bearer + Admin | Param: `id`, Body: resolution | `200 { report }` |
| GET | `/reports/target/query` | Bearer | Query: `targetType,targetId` | `200 { reports }` |

### 13) Reviews (`/api/reviews`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| GET | `/reviews/service/:serviceId` | Public | Query: list filters | `200 { reviews, pagination }` |
| GET | `/reviews/service/:serviceId/summary` | Public | Param: `serviceId` | `200 { summary }` |
| GET | `/reviews/service/:serviceId/me` | Bearer + User/Admin | Param: `serviceId` | `200 { review }` |
| POST | `/reviews` | Bearer + User/Admin | Body: review payload | `201 { review }` |
| PATCH | `/reviews/:id` | Bearer + User/Admin | Param: `id`, Body: update payload | `200 { review }` |
| DELETE | `/reviews/:id` | Bearer + User/Admin | Param: `id` | `200 { message }` |
| POST | `/reviews/:id/reply` | Bearer + User/Admin | Param: `id`, Body: reply payload | `200 { reply }` |
| POST | `/reviews/:id/helpful` | Bearer + User/Admin | Param: `id`, Body: helpful payload | `200 { message }` |
| GET | `/reviews/admin/list` | Bearer + Admin | Query: admin filters | `200 { reviews, pagination }` |
| PATCH | `/reviews/:id/moderate` | Bearer + Admin | Param: `id`, Body: moderation payload | `200 { review }` |
| DELETE | `/reviews/:id/admin` | Bearer + Admin | Param: `id` | `200 { message }` |

### 14) Website Reviews (`/api/website-reviews`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| GET | `/website-reviews` | Public | Query: list filters | `200 { reviews, pagination }` |
| GET | `/website-reviews/summary` | Public | - | `200 { summary }` |
| GET | `/website-reviews/me` | Bearer + User/Admin | - | `200 { review }` |
| POST | `/website-reviews` | Bearer + User/Admin | Body: review payload | `201 { review }` |
| PATCH | `/website-reviews/:id` | Bearer + User/Admin | Param: `id`, Body: update payload | `200 { review }` |
| DELETE | `/website-reviews/:id` | Bearer + User/Admin | Param: `id` | `200 { message }` |
| POST | `/website-reviews/:id/helpful` | Bearer + User/Admin | Param: `id`, Body: helpful payload | `200 { message }` |
| GET | `/website-reviews/admin/list` | Bearer + Admin | Query: admin filters | `200 { reviews, pagination }` |
| PATCH | `/website-reviews/:id/moderate` | Bearer + Admin | Param: `id`, Body: moderation payload | `200 { review }` |
| DELETE | `/website-reviews/:id/admin` | Bearer + Admin | Param: `id` | `200 { message }` |

### 15) Contact (`/api/contact`)

| Method | Endpoint | Auth | Request Format | Response Format |
|---|---|---|---|---|
| POST | `/contact` | Public (optional auth) | Body: `name,email,subject?,message` | `201 { contact }` |
| GET | `/contact/my` | Bearer | Query: `page,limit` | `200 { contacts, pagination }` |

### 16) Admin (`/api/admin`)

All admin endpoints require: Bearer + Admin role.

| Method | Endpoint | Request Format | Response Format |
|---|---|---|---|
| GET | `/admin/stats` | - | `200 { stats }` |
| GET | `/admin/stats/charts` | - | `200 { chartData }` |
| GET | `/admin/users` | Query optional filters | `200 { users, pagination }` |
| PATCH | `/admin/users/:id/status` | Param: `id`, Body: status payload | `200 { user }` |
| GET | `/admin/orders` | Query optional filters | `200 { orders, pagination }` |
| GET | `/admin/payments` | Query optional filters | `200 { payments, pagination }` |
| GET | `/admin/wallet` | - | `200 { wallet }` |
| GET | `/admin/bookings` | Query optional filters | `200 { bookings, pagination }` |
| GET | `/admin/listings` | Query optional filters | `200 { listings, pagination }` |
| PATCH | `/admin/listings/:id/suspend` | Param: `id`, Body: reason/deadline | `200 { listing }` |
| PATCH | `/admin/listings/:id/approve` | Param: `id` | `200 { listing }` |
| GET | `/admin/contacts` | Query: admin contact filters | `200 { contacts, pagination }` |
| PATCH | `/admin/contacts/:id/review` | Param: `id` | `200 { contact }` |
| PATCH | `/admin/contacts/:id/reply` | Param: `id`, Body: reply payload | `200 { contact }` |

## Request and Response Examples

One detailed example per endpoint group is provided below.

### Auth Example

`POST /api/auth/login`

Request:

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "user": {
    "id": "67f7d1...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOi..."
}
```

### Users Example

`PATCH /api/users/me`

Request:

```json
{
  "name": "John D",
  "bio": "Local seller in Colombo"
}
```

Response:

```json
{
  "user": {
    "id": "67f7d1...",
    "name": "John D",
    "bio": "Local seller in Colombo"
  }
}
```

### Listings Example

`POST /api/listings`

Request:

```json
{
  "type": "PRODUCT",
  "transactionMode": "BUY_NOW",
  "title": "iPhone 13",
  "description": "Good condition",
  "categoryId": "67f7a1...",
  "price": 250000,
  "currency": "LKR",
  "condition": "USED_GOOD",
  "images": ["https://example.com/iphone.jpg"],
  "location": {
    "city": "Colombo",
    "address": "No 10, Main Rd",
    "coordinates": {
      "type": "Point",
      "coordinates": [79.8612, 6.9271]
    }
  }
}
```

Response:

```json
{
  "listing": {
    "id": "6801ab...",
    "title": "iPhone 13",
    "status": "ACTIVE"
  }
}
```

### Categories Example

`POST /api/categories`

Request:

```json
{
  "name": "Electronics",
  "type": "PRODUCT",
  "description": "Electronic devices",
  "isActive": true
}
```

Response:

```json
{
  "category": {
    "id": "6802cc...",
    "name": "Electronics",
    "type": "PRODUCT"
  }
}
```

### Geospatial Example

`GET /api/geo-search/search?latitude=6.9271&longitude=79.8612&radiusKm=5`

Response:

```json
{
  "success": true,
  "data": {
    "products": [],
    "services": [],
    "total": 0
  },
  "query": {
    "latitude": 6.9271,
    "longitude": 79.8612,
    "radiusKm": 5
  }
}
```

### Orders Example

`POST /api/orders`

Request:

```json
{
  "listingId": "6801ab...",
  "quantity": 1,
  "deliveryMethod": "DELIVERY",
  "deliveryAddress": "No 100, Flower Rd, Colombo"
}
```

Response:

```json
{
  "id": "6803ef...",
  "status": "PENDING",
  "totalAmount": 250000
}
```

### Payments Example

`POST /api/payments/initiate`

Request:

```json
{
  "orderId": "6803ef..."
}
```

Response:

```json
{
  "paymentId": "6803f1...",
  "clientSecret": "pi_3..._secret_...",
  "amount": 25000000,
  "currency": "lkr"
}
```

### OTP Example

`POST /api/otp/send`

Request:

```json
{
  "phone": "+94771234567",
  "channel": "sms"
}
```

Response:

```json
{
  "sid": "VE...",
  "to": "+94771234567",
  "channel": "sms",
  "status": "pending",
  "valid": false,
  "message": "OTP sent successfully"
}
```

### Notifications Example

`GET /api/notifications?unreadOnly=true&page=1&limit=20`

Response:

```json
{
  "notifications": [
    {
      "_id": "68044a...",
      "title": "Order accepted",
      "isRead": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### Service Selling Example

`POST /api/serviceselling`

Request:

```json
{
  "title": "Home AC Repair",
  "description": "On-site AC service",
  "categoryId": "67f7a1...",
  "price": 4500,
  "pricingType": "FIXED",
  "locationText": "Colombo 05"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "68051d...",
    "status": "ACTIVE"
  }
}
```

### Service Booking Example

`POST /api/servicebookings`

Request:

```json
{
  "serviceId": "68051d...",
  "startAt": "2026-04-20T10:00:00.000Z",
  "durationMinutes": 60,
  "note": "Please bring tools"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "680522...",
    "status": "PENDING"
  }
}
```

### Reports Example

`POST /api/reports`

Request:

```json
{
  "targetType": "LISTING",
  "targetId": "6801ab...",
  "reason": "SPAM",
  "description": "Same listing posted repeatedly"
}
```

Response:

```json
{
  "report": {
    "id": "68060a...",
    "status": "OPEN"
  }
}
```

### Reviews Example

`POST /api/reviews`

Request:

```json
{
  "serviceId": "68051d...",
  "rating": 5,
  "title": "Great service",
  "content": "Very professional and on time",
  "source": "BOOKING"
}
```

Response:

```json
{
  "review": {
    "id": "68066d...",
    "rating": 5,
    "status": "PUBLISHED"
  }
}
```

### Website Reviews Example

`POST /api/website-reviews`

Request:

```json
{
  "rating": 4,
  "title": "Useful platform",
  "content": "Easy to browse nearby items"
}
```

Response:

```json
{
  "review": {
    "id": "6806af...",
    "rating": 4
  }
}
```

### Contact Example

`POST /api/contact`

Request:

```json
{
  "name": "Nimal Perera",
  "email": "nimal@example.com",
  "subject": "Payment issue",
  "message": "My payment did not update after checkout"
}
```

Response:

```json
{
  "contact": {
    "id": "6806dc...",
    "status": "OPEN"
  }
}
```

### Admin Example

`PATCH /api/admin/listings/6801ab.../suspend`

Request:

```json
{
  "reason": "Policy violation"
}
```

Response:

```json
{
  "listing": {
    "id": "6801ab...",
    "status": "SUSPENDED"
  }
}
```

## Operational Notes

- Stripe webhook endpoint uses raw body parser in `backend/src/app.ts`.
- Startup in `backend/src/server.ts` initializes:
  - MongoDB connection
  - Moderation cron
  - Stripe payout cron
  - Socket notification setup
- Swagger JSON is available at `/swagger.json`.

## Security and Validation

- Keep secrets in `.env` files only.
- All payloads are validated using Zod schemas in `backend/src/validators`.
- Protected routes use JWT auth middleware.
- Role-restricted routes use role middleware (`user`, `admin`).

## Troubleshooting

### Backend does not start

- Verify MongoDB URI and network access.
- Check `PORT` availability.
- Confirm required env variables are set.

### Stripe payments fail

- Verify Stripe test keys.
- Verify webhook secret.
- Ensure webhook target points to `/api/payments/webhook/stripe`.

### Google login fails

- Ensure backend `GOOGLE_CLIENT_ID` matches frontend `VITE_GOOGLE_CLIENT_ID`.
- Add `http://localhost:5173` in Google OAuth authorized origins.

### OTP send/verify fails

- Check `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`.
- Ensure phone numbers are in E.164 format.

## Documentation Maintenance

When API changes:

1. Update route-level OpenAPI comments in `backend/src/routes`.
2. Update validation schemas in `backend/src/validators`.
3. Update this README endpoint tables.
4. Re-test key flows (auth, order, payment, service booking, admin moderation).

## License

Add your project license here.
