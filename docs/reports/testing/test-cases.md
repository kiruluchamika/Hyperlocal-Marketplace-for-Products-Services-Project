# Test Cases

The following test cases are based on the implemented files under `tests/` and `backend/tests/unit/`. This document does not include tests that are not present in the repository.

## Auth

| Test case ID | Test file | Scenario | Expected result |
| --- | --- | --- | --- |
| AUTH-API-001 | `tests/api/auth.spec.ts` | Login API is called with an email that does not exist and an incorrect password. | API returns `401` with message `Invalid credentials`. |
| AUTH-API-002 | `tests/api/auth.spec.ts` | Register API is called with an empty request body. | API returns `400`, message `Validation error`, and an errors array. |

## Categories

### Playwright API and Performance Tests

| Test case ID | Test file | Scenario | Expected result |
| --- | --- | --- | --- |
| CAT-API-001 | `tests/api/category.spec.ts` | Get categories with page and limit query parameters. | API returns `200`, a data array, pagination metadata, and category objects with the expected shape. |
| CAT-API-002 | `tests/api/category.spec.ts` | Get categories with an invalid `type` filter. | API returns `400`, message `Validation error`, and an errors array. |
| CAT-API-003 | `tests/api/category.spec.ts` | A regular registered user attempts to create a category. | API returns `403` with message `Forbidden`. |
| CAT-PERF-001 | `tests/performance/basic-load.js` | k6 runs a basic load test against `http://localhost:5000/api/categories` with 10 virtual users for 10 seconds. | Requests to `/api/categories` return HTTP `200` during the run. |
| CAT-PERF-002 | `tests/performance/categories-load.js` | k6 runs a category listing load test against `/api/categories?isActive=true&page=1&limit=5` with 5 virtual users for 10 seconds. | Requests return HTTP `200` during the run. |

### Backend Unit Tests

| Test case ID | Test file | Scenario | Expected result |
| --- | --- | --- | --- |
| CAT-UNIT-001 | `backend/tests/unit/categories/categoryController.test.ts` | Category controller handlers return mapped responses for create, list, and delete flows and forward service errors. | Response status/body mappings are correct and service errors are passed to `next`. |
| CAT-UNIT-002 | `backend/tests/unit/categories/categorySchemas.test.ts` | Category schema validation parses valid payloads, applies defaults, validates params, and rejects invalid or empty input. | Valid payloads are parsed; invalid payloads are rejected with validation errors. |
| CAT-UNIT-003 | `backend/tests/unit/categories/categoryService.test.ts` | Category service handles create, duplicate-name rejection, list filtering/pagination, update, lookup failure, and soft/hard delete behavior. | Service logic returns expected data and throws application errors for invalid states. |

## Product Listings

### Playwright API and Performance Tests

| Test case ID | Test file | Scenario | Expected result |
| --- | --- | --- | --- |
| PROD-LIST-API-001 | `tests/api/product-listings.spec.ts` | Public product listings endpoint is called with pagination. | API returns `200`, success flag, paginated data, and active product listing objects with expected fields. |
| PROD-LIST-API-002 | `tests/api/product-listings.spec.ts` | Public product listings endpoint is called with `minPrice` greater than `maxPrice`. | API returns `400`, message `Validation error`, and an errors array. |
| PROD-LIST-API-003 | `tests/api/product-listings.spec.ts` | Authenticated user creates a product listing, then the public detail endpoint is requested. | Listing is created with `201`; detail endpoint returns `200`, the created listing data, `ACTIVE` status, and `isWishlisted` as false. |
| PROD-LIST-API-004 | `tests/api/product-listings.spec.ts` | A non-owner regular user attempts to update another user's product listing. | API returns `403` with message `Forbidden`. |
| PROD-LIST-PERF-001 | `tests/performance/product-listings-load.js` | k6 runs a load test against `/api/listings?page=1&limit=5` with 10 virtual users for 10 seconds. | Requests return HTTP `200`, `success` is true, response data is an array, and pagination page remains `1`. |

### Backend Unit Tests

| Test case ID | Test file | Scenario | Expected result |
| --- | --- | --- | --- |
| PROD-LIST-UNIT-001 | `backend/tests/unit/product-listings/listingController.test.ts` | Product listing controller handlers map authenticated user context, query parameters, success responses, and service errors. | Controller calls the service with normalized inputs and returns the expected JSON structure. |
| PROD-LIST-UNIT-002 | `backend/tests/unit/product-listings/listingMiddleware.test.ts` | Ownership middleware handles unauthenticated, unauthorized, and owner/admin access paths. | Unauthorized requests are rejected and permitted users are allowed through. |
| PROD-LIST-UNIT-003 | `backend/tests/unit/product-listings/listingSchemas.test.ts` | Listing schemas parse valid payloads, validate object IDs, reject empty updates, and reject inverted price ranges. | Valid inputs are normalized and invalid inputs fail validation. |
| PROD-LIST-UNIT-004 | `backend/tests/unit/product-listings/listingService.test.ts` | Listing service covers creation, attribute validation, public filtering, detail serialization, ownership checks, update/delete behavior, wishlist restrictions, and admin modification. | Service methods return expected results and reject unsupported actions where required. |

## Product Orders

### Playwright API and Performance Tests

| Test case ID | Test file | Scenario | Expected result |
| --- | --- | --- | --- |
| PROD-ORDER-API-001 | `tests/api/product-orders.spec.ts` | Buyer creates a pending product order for another user's `BUY_NOW` listing using pickup. | API returns `201`, success flag, payment next step, correct buyer/seller/listing IDs, quantity, amount, pickup snapshot, and `PENDING` status. |
| PROD-ORDER-API-002 | `tests/api/product-orders.spec.ts` | Listing owner attempts to order their own listing. | API returns `400` with message `You cannot order your own listing`. |
| PROD-ORDER-API-003 | `tests/api/product-orders.spec.ts` | Buyer creates a delivery order and then cancels the pending order. | Create request returns `201`; cancel request returns `200`, success flag, cancellation message, and `CANCELLED` status. |
| PROD-ORDER-PERF-001 | `tests/performance/product-orders-load.js` | k6 setup creates seller and buyer accounts, creates a `BUY_NOW` product listing, creates a pending order, and then performs repeated reads of that order with 2 virtual users for 10 seconds. | Setup requests succeed, the order read request returns HTTP `200`, the returned order ID matches the created order, and allowed actions are returned as an array. |

### Backend Unit Tests

| Test case ID | Test file | Scenario | Expected result |
| --- | --- | --- | --- |
| PROD-ORDER-UNIT-001 | `backend/tests/unit/product-orders/orderController.test.ts` | Product order controller handlers map buyer/admin input, parse list query values, return success responses, and forward service errors. | Controller outputs match the expected API contract and failures are passed to `next`. |
| PROD-ORDER-UNIT-002 | `backend/tests/unit/product-orders/orderSchemas.test.ts` | Order schemas validate pickup and delivery payloads, OTP confirmation payloads, pagination values, and delivery-detail updates. | Valid requests are parsed and invalid requests are rejected with validation errors. |
| PROD-ORDER-UNIT-003 | `backend/tests/unit/product-orders/orderService.test.ts` | Order service covers pickup-order creation, self-order prevention, cancellation/refund handling, OTP confirmation rules, invalid OTP attempts, and delivery-detail update restrictions. | Service logic enforces the documented order rules and raises errors for invalid actions. |

## Service Listings

### Playwright API and Performance Tests

| Test case ID | Test file | Scenario | Expected result |
| --- | --- | --- | --- |
| SERV-LIST-API-001 | `tests/api/service-listings.spec.ts` | Public service listings endpoint is called with pagination. | API returns `200`, success flag, active service listing data, `ACTIVE` status, and `isActive` true. |
| SERV-LIST-API-002 | `tests/api/service-listings.spec.ts` | Public service listings endpoint is called with an invalid `pricingType` filter. | API returns `400`, message `Validation error`, and an errors array. |
| SERV-LIST-API-003 | `tests/api/service-listings.spec.ts` | Authenticated user creates a service listing, then the public detail endpoint is requested. | Listing is created with `201`; detail endpoint returns `200`, created service data, `ACTIVE` status, and `isActive` true. |
| SERV-LIST-API-004 | `tests/api/service-listings.spec.ts` | A non-owner regular user attempts to update another user's service listing. | API returns `403` with message `Forbidden`. |
| SERV-LIST-PERF-001 | `tests/performance/service-listings-load.js` | k6 runs a load test against `/api/serviceselling?page=1&limit=5` with 10 virtual users for 10 seconds. | Requests return HTTP `200`, `success` is true, and response data is an array. |

### Backend Unit Tests

| Test case ID | Test file | Scenario | Expected result |
| --- | --- | --- | --- |
| SERV-LIST-UNIT-001 | `backend/tests/unit/service-listings/serviceSellingMiddleware.test.ts` | Service listing ownership middleware rejects unauthenticated or unauthorized users and allows owners through. | Protected modification requests are blocked or allowed according to ownership checks. |
| SERV-LIST-UNIT-002 | `backend/tests/unit/service-listings/serviceSellingSchemas.test.ts` | Service listing schemas parse valid payloads, reject invalid coordinates, allow partial updates, and normalize list query values. | Valid inputs are accepted and invalid inputs fail validation. |
| SERV-LIST-UNIT-003 | `backend/tests/unit/service-listings/serviceSellingService.test.ts` | Service listing service covers creation, required attribute validation, active-only filtering, view counting, owner/admin access rules, update/delete behavior, moderation removal, and ownership checks. | Service logic returns expected results and rejects invalid actions where applicable. |

## Service Bookings

| Test case ID | Test file | Scenario | Expected result |
| --- | --- | --- | --- |
| SERV-BOOK-API-001 | `tests/api/service-bookings.spec.ts` | Buyer creates a pending service booking for another user's service listing and views their pending bookings. | API returns `201`, booking is linked to the service, buyer, and provider, status is `PENDING`, and the booking appears in the buyer's pending booking list. |
| SERV-BOOK-API-002 | `tests/api/service-bookings.spec.ts` | Provider accepts a pending service booking and checks the provider booking list. | Decision request returns `200`, booking status becomes `PROVIDER_ACCEPTED`, and the booking appears in the provider accepted booking list. |
| SERV-BOOK-API-003 | `tests/api/service-bookings.spec.ts` | Provider rejects a pending service booking and checks the provider booking list. | Decision request returns `200`, booking status becomes `REJECTED`, and the booking appears in the provider rejected booking list. |

## Admin/Moderation

| Test case ID | Test file | Scenario | Expected result |
| --- | --- | --- | --- |
| ADMIN-API-001 | `tests/api/admin-moderation.spec.ts` | Admin stats endpoint is requested without authentication. | API returns `401` with message `Authentication required`. |
| ADMIN-API-002 | `tests/api/admin-moderation.spec.ts` | Regular user attempts admin login and then attempts to access admin listings. | Admin login returns `403` with `Admin access required`; admin listings returns `403` with `Forbidden`. |
| ADMIN-API-003 | `tests/api/admin-moderation.spec.ts` | Regular user attempts to suspend a product listing through the admin moderation endpoint. | Suspend request returns `403`; product listing detail remains accessible with `ACTIVE` status. |

## Basic UI/Protected Routes

| Test case ID | Test file | Scenario | Expected result |
| --- | --- | --- | --- |
| UI-001 | `tests/ui/homepage.spec.ts` | Home page is opened at `http://localhost:3000`. | Page loads and has a valid URL. |
| UI-002 | `tests/ui/login.spec.ts` | Login page is opened at `http://localhost:3000/login`. | Browser URL includes `/login`. |
| UI-003 | `tests/ui/admin.spec.ts` | Admin login page is opened at `http://localhost:3000/admin/login`. | Browser URL includes `/admin/login`. |
| UI-004 | `tests/ui/protected.spec.ts` | Unauthenticated user opens `http://localhost:3000/dashboard`. | User is redirected to a URL containing `/login`. |
