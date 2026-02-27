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

---

## 4) API Modules (High-Level)

> Base URL example: `http://localhost:<PORT>/api`

Based on controller structure, APIs are organized as:

- **Auth APIs** (`/auth`)
  Register, login, token/credential workflows.
- **User APIs** (`/users`)
  Profile retrieval/update, user management.
- **Category APIs** (`/categories`)
  Category CRUD/listing.
- **Geo APIs** (`/geo`)
  Location/region based queries.
- **Listing APIs** (`/listings`)
  Create/update/delete/search marketplace listings.
- **Order APIs** (`/orders`)
  Create orders, status updates, order history.
- **Payment APIs** (`/payments`)
  Payment initiation/confirmation/status.
- **OTP APIs** (`/otp`)
  Send/verify one-time passwords.
- **Notification APIs** (`/notifications`)
  User notifications retrieval/acknowledgement.

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

Add your project license here (e.g., MIT).
