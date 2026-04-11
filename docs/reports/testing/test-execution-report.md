# Test Execution Report

## Execution Summary

The implemented automated tests are located under `tests/` and are executed primarily with Playwright. The project also includes one k6 performance test under `tests/performance/basic-load.js`.

The latest available Playwright run metadata in `frontend/test-results/.last-run.json` shows:

- Status: `passed`
- Failed tests: `[]`

This report records the current implemented Playwright test set as passing in the latest available run metadata. It does not claim that untested modules or unimplemented scenarios passed.

## Playwright Execution

Playwright is configured in `frontend/playwright.config.ts`:

- Test directory: `../tests`
- Timeout: 30 seconds
- Workers: `1`
- Headless mode: enabled
- Reporters: list and HTML report

The test suite currently runs reliably with Playwright workers set to `1`.

Command used from the frontend project:

```bash
cd frontend
npm run test:e2e
```

Equivalent direct command:

```bash
cd frontend
node ./node_modules/@playwright/test/cli.js test
```

The application services must be running locally before executing these tests:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

The tests expect:

- Backend API: `http://localhost:5000/api`
- Frontend: `http://localhost:3000`

### Backend Running State

![Backend Running State](./screenshots/backendscreenshot/backend-running.PNG)

## Playwright Test Files Executed

| Area | Files |
| --- | --- |
| API tests | `tests/api/auth.spec.ts`, `tests/api/category.spec.ts`, `tests/api/product-listings.spec.ts`, `tests/api/product-orders.spec.ts`, `tests/api/service-listings.spec.ts`, `tests/api/service-bookings.spec.ts`, `tests/api/admin-moderation.spec.ts` |
| UI tests | `tests/ui/homepage.spec.ts`, `tests/ui/login.spec.ts`, `tests/ui/admin.spec.ts`, `tests/ui/protected.spec.ts` |

Total implemented Playwright tests identified in the current test files: 26.

## Playwright Result Summary

| Test area | Implemented test count | Current status |
| --- | ---: | --- |
| Auth API | 2 | Passed in latest available Playwright run metadata |
| Categories API | 3 | Passed in latest available Playwright run metadata |
| Product listings API | 4 | Passed in latest available Playwright run metadata |
| Product orders API | 3 | Passed in latest available Playwright run metadata |
| Service listings API | 4 | Passed in latest available Playwright run metadata |
| Service bookings API | 3 | Passed in latest available Playwright run metadata |
| Admin/moderation API | 3 | Passed in latest available Playwright run metadata |
| Basic UI/protected routes | 4 | Passed in latest available Playwright run metadata |
| Total Playwright tests | 26 | Passed in latest available Playwright run metadata |

### Playwright Test Result

![Playwright Test Result](./screenshots/playwright/playwright-result.PNG)

### Playwright HTML Report

![Playwright HTML Report Overview](./screenshots/playwright/playwright-report-1.PNG)

![Playwright HTML Report Details](./screenshots/playwright/playwright-report-2.PNG)

## k6 Performance Test Execution

The performance test file is `tests/performance/basic-load.js`.

Command:

```bash
k6 run tests/performance/basic-load.js
```

Performance test configuration:

- Endpoint tested: `/api/categories`
- Full URL in script: `http://localhost:5000/api/categories`
- Virtual users: 10
- Duration: 10 seconds
- Check performed: response status is `200`

Recorded k6 run summary:

| Metric | Result |
| --- | --- |
| Endpoint tested | `/api/categories` |
| Virtual users | 10 |
| Duration | 10s |
| Total requests | 83 |
| Failed requests | 0 |
| Average response time | About 252.83 ms |

This is a basic endpoint load check only. It should not be interpreted as a complete performance benchmark for the full system.

### k6 Load Test Result

![k6 Load Test Result](./screenshots/k6/k6-result.PNG)

## Swagger/API Documentation Support

Swagger/OpenAPI is present in the backend and can be used for manual inspection and verification of API contracts. It is configured in `backend/src/config/swagger.ts` and mounted in `backend/src/app.ts` at:

- `/api-docs`
- `/swagger`
- `/docs`
- `/swagger.json`

Swagger was treated as API documentation/manual verification support, not as an automated testing tool in the current implemented test set.

## Evidence Notes

The report already references available screenshots for the backend running state, the Playwright result, the Playwright HTML report, and the k6 result. Before final submission, confirm that these screenshots match the final local run you want to submit.
