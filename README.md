# Hyperlocal Marketplace for Products & Services

Backend API for a **hyperlocal marketplace** where users can discover nearby products/services, place orders, make payments, receive notifications, and manage listings.

---

## 1) System Overview

This system provides a location-aware marketplace platform with:

- User authentication and profile management
- Product/service listing management
- Category and geo-location support
- Order lifecycle management
- Payment integration
- OTP and notification workflows
- Dedicated service ads + booking workflow with deposit payments
- API documentation support (Swagger)

Core backend lives in `backend/src`, with app bootstrap in `backend/src/app.ts` and server startup in `backend/src/server.ts`.

---

## 2) Purpose

The main goals of this backend are to:

1. Enable buyers and sellers/providers to interact within a local region.
2. Support secure onboarding/login and identity verification (OTP).
3. Provide scalable APIs for listings, orders, and payments.
4. Offer extensibility through modular controllers/services structure.
5. Improve developer experience with typed TypeScript code and Swagger docs.

---

## 3) Key Components

### Application Entry
- `backend/src/app.ts`: Express app setup, middleware registration, route mounting.
- `backend/src/server.ts`: HTTP server start/listen logic.

### Configuration
- `backend/src/config/env.ts`: Environment variable loading/validation.
- `backend/src/config/db.ts`: Database configuration/connection.
- `backend/src/config/swagger.ts`: Swagger/OpenAPI setup.

### Controllers
- `backend/src/controllers/authController.ts`
- `backend/src/controllers/userController.ts`
- `backend/src/controllers/categoryController.ts`
- `backend/src/controllers/geoController.ts`
- `backend/src/controllers/listingController.ts`
- `backend/src/controllers/orderController.ts`
- `backend/src/controllers/paymentController.ts`
- `backend/src/controllers/otpController.ts`
- `backend/src/controllers/notificationController.ts`

### Other Layers
- `backend/src/routes`: Route definitions.
- `backend/src/services`: Business logic/services.
- `backend/src/models`: Data models/entities.
- `backend/src/middlewares`: Auth/error/validation middleware.
- `backend/src/validators`: Request validation schemas.
- `backend/src/utils`: Shared utilities.
- `backend/src/types`: Shared TypeScript types.
- `backend/src/modules`: Feature/module grouping.

### Background Script
- `backend/scripts/notification-listener.js`: Notification/event listener process.

### Service Domain (Latest Updates)
- `backend/src/models/ServiceSelling.ts`: Service ad model (status lifecycle, pricing type, moderation fields).
- `backend/src/models/ServiceBooking.ts`: Booking model with status transitions and deposit details.
- `backend/src/services/serviceSellingService.ts`: Service ad feed/my ads/admin moderation logic.
- `backend/src/services/serviceBookingService.ts`: Booking create/decision/cancel/slots/deposit confirmation logic.
- `backend/src/routes/serviceSellingRoutes.ts`: Service ad APIs mounted under `/serviceselling`.
- `backend/src/routes/serviceBookingRoutes.ts`: Service booking APIs mounted under `/servicebookings`.

---

## 4) API Modules (High-Level)

> Base URL example: `http://localhost:<PORT>/api`

Based on currently mounted routes (`backend/src/routes/index.ts`), APIs are organized as:

- **Auth APIs** (`/auth`)
  Register, login, token/credential workflows.
- **User APIs** (`/users`)
  Profile retrieval/update, user management.
- **Category APIs** (`/categories`)
  Category CRUD/listing.
- **Geo APIs** (`/geo-search`)
  Location/region based queries.
- **Listing APIs** (`/listings`)
  Create/update/delete/search marketplace listings.
- **Order APIs** (`/orders`)
  Create orders, status updates, order history.
- **Payment APIs** (`/payments`)
  Payment initiation/confirmation/status.
- **OTP APIs** (`/otp`)
  Send/verify one-time passwords.
- **Service Selling APIs** (`/serviceselling`)
  Public service feed, my ads, admin moderation, create/update/delete service ads.
- **Service Booking APIs** (`/servicebookings`)
  Booking requests, provider decisions, cancellation, availability slots, and booking deposit initiation.

### Service Selling API (Important Endpoints)
- `GET /serviceselling` - Public feed (ACTIVE ads only, includes search/filter by category/pricing/price range).
- `GET /serviceselling/me` - Logged-in user’s own service ads (all statuses).
- `GET /serviceselling/admin` - Admin dashboard list with optional status/search filters.
- `GET /serviceselling/:id` - Get single service ad (non-active ads visible only to owner/admin).
- `POST /serviceselling` - Create service ad (user role).
- `PUT /serviceselling/:id` - Update service ad (owner role checks).
- `DELETE /serviceselling/:id` - Soft delete own service ad.
- `PATCH /serviceselling/:id/moderate` - Admin soft remove with reason.

### Service Booking API (Important Endpoints)
- `POST /servicebookings` - Buyer creates booking request (`PENDING`).
- `GET /servicebookings/me` - Buyer booking history with optional status filter.
- `GET /servicebookings/provider/me` - Provider bookings with optional status filter.
- `GET /servicebookings/slots` - Public confirmed busy slots for a service.
- `PATCH /servicebookings/:id/cancel` - Buyer cancels booking (only `PENDING`).
- `PATCH /servicebookings/:id/decision` - Provider accepts/rejects booking.
- `POST /servicebookings/:id/deposit/initiate` - Buyer starts Stripe deposit payment after provider acceptance.

### Service Booking Status Flow
`PENDING -> PROVIDER_ACCEPTED -> CONFIRMED`

Alternative exits:
- `PENDING -> REJECTED`
- `PENDING -> CANCELLED`

### Deposit Rules (Current Behavior)
- Allowed only when booking status is `PROVIDER_ACCEPTED`.
- Hourly services: deposit uses full hourly amount.
- Fixed-price services: deposit is `20%` of service price.
- On successful Stripe confirmation, booking is moved to `CONFIRMED` after slot conflict check.

For exact request/response contracts, use Swagger configured in `backend/src/config/swagger.ts`.

---

## 5) Project Structure

```text
backend/
  .env
  .env.example
  package.json
  tsconfig.json
  scripts/
    notification-listener.js
  src/
    app.ts
    server.ts
    config/
    controllers/
    middlewares/
    models/
    modules/
    routes/
    services/
    types/
    utils/
    validators/
```

---

## 6) Setup & Run

### Prerequisites
- Node.js (LTS recommended)
- npm
- Configured database instance

### Installation
```bash
cd backend
npm install
```

### Environment
Create and configure `.env` based on `.env.example`.

Files:
- `backend/.env.example`
- `backend/.env`

Typical variables:
- `PORT`
- `NODE_ENV`
- `DB_*` (database values)
- `JWT_*` / auth secrets
- Payment provider keys
- Notification provider keys

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Notification Listener (if used)
```bash
node scripts/notification-listener.js
```

---

## 7) Documentation

- Swagger/OpenAPI bootstrap: `backend/src/config/swagger.ts`
- Recommended endpoint for docs (project-dependent): `/api-docs`

---

## 8) Security & Validation

- Keep secrets only in `backend/.env` (never commit).
- Validate all request payloads via `backend/src/validators`.
- Use middleware in `backend/src/middlewares` for authentication, authorization, and error handling.

---

## 9) Suggested README Additions (Optional)

Add these once finalized:
- Database schema/ERD
- Role matrix (admin/seller/buyer permissions)
- Postman collection
- CI/CD workflow
- Deployment guide (Docker/VM/cloud)

---

## 10) License

