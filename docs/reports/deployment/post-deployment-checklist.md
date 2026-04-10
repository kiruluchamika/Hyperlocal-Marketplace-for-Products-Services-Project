# Post-Deployment Checklist

## 1. Checklist Metadata
- Project: Hyperlocal Marketplace for Products and Services (Bazaaro)
- Version: v1.0.0-beta
- Date:
- Verified By:

## 2. Infrastructure and Availability
| Check | Status (Pass/Fail) | Notes |
|---|---|---|
| Frontend URL loads (https://www.bazaro.online) |  |  |
| Backend URL loads (https://api.bazaro.online) |  |  |
| API docs endpoint opens (/api-docs) |  |  |
| SSL valid for frontend domain |  |  |
| SSL valid for backend domain |  |  |

## 3. Authentication and Session
| Check | Status (Pass/Fail) | Notes |
|---|---|---|
| User registration works |  |  |
| User login works |  |  |
| Admin login works |  |  |
| Protected routes enforce access control |  |  |
| Logout and confirmation modal works |  |  |

## 4. Core Functional Flows
| Check | Status (Pass/Fail) | Notes |
|---|---|---|
| Product listing page loads data |  |  |
| Listing detail page loads |  |  |
| Order creation flow works |  |  |
| Service booking flow works |  |  |
| Notifications load for user/admin |  |  |

## 5. Payment and Runtime Controls
| Check | Status (Pass/Fail) | Notes |
|---|---|---|
| Stripe payment initiation works (test/prod mode) |  |  |
| Payment confirmation works |  |  |
| Payments-disabled toggle blocks payment actions |  |  |
| Maintenance mode toggle applies restrictions correctly |  |  |
| Non-admin behavior in maintenance mode is correct |  |  |
| Admin behavior in maintenance mode is correct |  |  |

## 6. API and Data Validation
| Check | Status (Pass/Fail) | Notes |
|---|---|---|
| MongoDB connection stable |  |  |
| CRUD endpoints return expected status codes |  |  |
| Validation errors handled cleanly |  |  |
| 401/403/404/500 error handling verified |  |  |

## 7. Performance and Operational Checks
| Check | Status (Pass/Fail) | Notes |
|---|---|---|
| First load latency acceptable |  |  |
| Cold-start behavior acknowledged (free tier) |  |  |
| No critical errors in backend logs |  |  |
| No critical frontend console errors |  |  |

## 8. Final Sign-Off
- Deployment accepted for evaluation: Yes / No
- Blocking issues remaining:
- Next actions:
- Reviewer signature/name:
