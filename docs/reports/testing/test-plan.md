# Test Plan

## Project Testing Objective

The objective of testing for the Hyperlocal Marketplace for Products and Services project is to verify the main implemented behaviors that are currently covered by automated tests in the repository. The present test suite focuses on API behavior, selected integration-style workflows, basic UI route checks, protected route behavior, and one basic performance load test.

This report is based only on the tests currently present under `tests/`. It does not claim full system coverage or 100% coverage of all marketplace features.

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
- Performance: a basic k6 load test for the categories endpoint.

The following areas are outside the scope of the current implemented automated tests:

- Complete end-to-end browser coverage of every user journey.
- Payment provider integration verification beyond the order and booking API states covered by the existing tests.
- Full admin dashboard UI verification.
- Full accessibility, security, compatibility, and cross-browser coverage.
- Full performance testing of all API endpoints.

## Testing Types Used

| Testing type | Current usage |
| --- | --- |
| API testing | Playwright request tests are used for auth, categories, product listings, product orders, service listings, service bookings, and admin/moderation API behavior. |
| Integration-style testing | Playwright tests create users, listings, orders, and bookings, then verify related actions such as detail retrieval, list filtering, cancellation, acceptance, and rejection. |
| UI smoke testing | Playwright page tests verify that key routes open or redirect as expected. |
| Access control testing | Playwright API tests verify that unauthenticated, regular-user, and non-owner actions are rejected where required. |
| Performance testing | k6 is used for a basic load test against `/api/categories`. |
| Manual API documentation support | Swagger/OpenAPI is available for API documentation and manual verification through `/api-docs`, `/swagger`, `/docs`, and `/swagger.json`. Swagger is not used as an automated test runner in the current test set. |

## Tools Used

| Tool | Purpose | Evidence in project |
| --- | --- | --- |
| Playwright | UI, API, and integration-style testing | `frontend/package.json`, `frontend/playwright.config.ts`, `tests/api/*.spec.ts`, `tests/ui/*.spec.ts` |
| k6 | Performance/load testing | `tests/performance/basic-load.js` |
| Swagger/OpenAPI | API documentation and manual verification support | `backend/src/config/swagger.ts`, `backend/src/app.ts`, backend Swagger dependencies |

## Environment and Setup Summary

The tests assume the application is running locally:

- Backend API base URL used by the tests: `http://localhost:5000/api`
- Frontend URL used by the UI tests: `http://localhost:3000`
- Playwright test directory: `tests/`
- Playwright configuration file: `frontend/playwright.config.ts`
- Playwright timeout: 30 seconds per test
- Playwright headless mode: enabled
- Playwright workers: `1`

The Playwright configuration currently sets `workers: 1`. The implemented test set is expected to run most reliably in single-worker mode because several API tests create and clean up live records against the same local backend and database.

## Module Coverage Summary

| Module | Current implemented coverage |
| --- | --- |
| Auth | Negative login validation and registration validation error handling. |
| Categories | Category list retrieval, invalid type validation, and blocked category creation by regular users. |
| Product listings | Public paginated listing retrieval, invalid price range validation, authenticated listing creation, public detail retrieval, and non-owner update rejection. |
| Product orders | Pending order creation for another user's `BUY_NOW` listing, self-order prevention, and buyer cancellation of a pending order. |
| Service listings | Public active service listing retrieval, invalid pricing type validation, authenticated service listing creation, public detail retrieval, and non-owner update rejection. |
| Service bookings | Pending booking creation, buyer booking list checks, provider acceptance, provider rejection, and provider booking list checks. |
| Admin/moderation | Admin stats authentication requirement, blocked regular-user admin login/listing access, and blocked listing suspension by regular users. |
| Basic UI/protected routes | Home page route, login route, admin login route, and redirect of unauthenticated dashboard access to login. |
| Performance | k6 load test for `/api/categories` only. |
