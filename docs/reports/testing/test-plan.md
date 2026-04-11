# Test Plan

## Project Testing Objective

The objective of testing for the Hyperlocal Marketplace for Products and Services project is to verify the main implemented behaviors that are currently covered by automated tests in the repository. The current test suite focuses on API behavior, selected integration-style workflows, basic UI route checks, protected route behavior, backend unit testing for selected modules, and the k6 performance scripts that are present under `tests/performance/`.

This report is based only on the tests currently present under `tests/` and `backend/tests/unit/`. It does not claim full system coverage or 100% coverage of all marketplace features.

## Testing Scope

The implemented tests currently cover the following areas:

- Auth: login failure handling and registration validation.
- Categories: category listing, query validation, and access control for category creation.
- Product listings: public listing retrieval, listing creation, detail retrieval, validation, and non-owner update protection.
- Product orders: order creation, self-order prevention, and buyer cancellation.
- Service listings: public listing retrieval, listing creation, detail retrieval, validation, and non-owner update protection.
- Service bookings: booking creation, buyer/provider booking list checks, provider acceptance, and provider rejection.
- Admin/moderation: admin statistics authentication, admin login access control, admin listing access control, and regular-user suspension prevention.
- Basic UI/protected routes: home page, login page, admin login page, and unauthenticated dashboard redirect.
- Backend unit tests: selected controller, schema/validator, middleware, and service behaviors for categories, product listings, product orders, and service listings.
- Performance scripts: k6 load scripts for categories, product listings, service listings, and product orders.

The following areas are outside the scope of the current implemented automated tests:

- Complete end-to-end browser coverage of every user journey.
- A dedicated `tests/e2e/` suite. No separate `tests/e2e/` folder is currently present.
- Payment provider integration verification beyond the order and booking API states covered by the existing tests.
- Full admin dashboard UI verification.
- Full accessibility, security, compatibility, and cross-browser coverage.
- Unit testing for all backend modules and every helper path.

## Testing Types Used

| Testing type | Current usage |
| --- | --- |
| API testing | Playwright request tests are used for auth, categories, product listings, product orders, service listings, service bookings, and admin/moderation API behavior. |
| Integration-style testing | Playwright tests create users, listings, orders, and bookings, then verify related actions such as detail retrieval, list filtering, cancellation, acceptance, and rejection. |
| UI smoke testing | Playwright page tests verify that key routes open or redirect as expected. |
| Access control testing | Playwright API tests verify that unauthenticated, regular-user, and non-owner actions are rejected where required. |
| Backend unit testing | Vitest unit tests cover selected controller, schema/validator, middleware, and service logic for categories, product listings, product orders, and service listings. |
| Performance testing | k6 scripts are present for categories, product listings, service listings, and product orders. |
| Manual API documentation support | Swagger/OpenAPI is available for API documentation and manual verification through `/api-docs`, `/swagger`, `/docs`, and `/swagger.json`. Swagger is not used as an automated test runner in the current test set. |

## Tools Used

| Tool | Purpose | Evidence in project |
| --- | --- | --- |
| Playwright | UI, API, and integration-style testing | `frontend/package.json`, `frontend/playwright.config.ts`, `tests/api/*.spec.ts`, `tests/ui/*.spec.ts` |
| Vitest | Backend unit testing | `backend/package.json`, `backend/tests/unit/categories/*.test.ts`, `backend/tests/unit/product-listings/*.test.ts`, `backend/tests/unit/product-orders/*.test.ts`, `backend/tests/unit/service-listings/*.test.ts` |
| k6 | Performance/load testing | `tests/performance/basic-load.js`, `tests/performance/categories-load.js`, `tests/performance/product-listings-load.js`, `tests/performance/service-listings-load.js`, `tests/performance/product-orders-load.js` |
| Swagger/OpenAPI | API documentation and manual verification support | `backend/src/config/swagger.ts`, `backend/src/app.ts`, backend Swagger dependencies |

## Environment and Setup Summary

The tests assume the application is running locally:

- Backend API base URL used by the tests: `http://localhost:5000/api`
- Frontend URL used by the UI tests: `http://localhost:3000`
- Playwright test directory: `tests/`
- Backend unit test directory: `backend/tests/unit/`
- Playwright configuration file: `frontend/playwright.config.ts`
- Playwright timeout: 30 seconds per test
- Playwright headless mode: enabled
- Playwright workers: `1`
- Backend unit test runner: Vitest via `backend/package.json` script `test:unit`

The Playwright configuration currently sets `workers: 1`. The implemented test set is expected to run most reliably in single-worker mode because several API tests create and clean up live records against the same local backend and database.

## Module Coverage Summary

| Module | Current implemented coverage |
| --- | --- |
| Auth | Negative login validation and registration validation error handling. |
| Categories | Playwright covers category list retrieval, invalid type validation, and blocked category creation by regular users. Vitest covers selected category controller responses, schema validation, service filtering/pagination, duplicate-name rejection, update behavior, and soft/hard delete logic. k6 also covers category endpoint load scripts. |
| Product listings | Playwright covers public paginated listing retrieval, invalid price range validation, authenticated listing creation, public detail retrieval, and non-owner update rejection. Vitest covers selected controller mapping, ownership middleware, schema validation, listing service creation/filtering/view/update/delete behavior, wishlist restrictions, and admin modification checks. k6 also covers product listing load scripts. |
| Product orders | Playwright covers pending order creation for another user's `BUY_NOW` listing, self-order prevention, and buyer cancellation of a pending order. Vitest covers selected controller request mapping, order schemas, and order service logic including pickup-order creation, self-order prevention, cancellation/refund flow, OTP-related confirmation checks, and delivery detail update protection. k6 also covers the product order workflow script. |
| Service listings | Playwright covers public active service listing retrieval, invalid pricing type validation, authenticated service listing creation, public detail retrieval, and non-owner update rejection. Vitest covers selected ownership middleware, service listing schemas, and service logic including creation, required attribute validation, public filtering, view counting, update/delete behavior, moderation removal, and ownership checks. k6 also covers service listing load scripts. |
| Service bookings | Pending booking creation, buyer booking list checks, provider acceptance, provider rejection, and provider booking list checks. |
| Admin/moderation | Admin stats authentication requirement, blocked regular-user admin login/listing access, and blocked listing suspension by regular users. |
| Basic UI/protected routes | Home page route, login route, admin login route, and redirect of unauthenticated dashboard access to login. |
| Performance | Five k6 scripts are currently present under `tests/performance/`, including one basic categories script and four module-level scripts. |
