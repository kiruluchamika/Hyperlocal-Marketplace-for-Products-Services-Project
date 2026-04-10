# Rollback Plan

## 1. Objective
Provide a controlled recovery procedure if production deployment causes critical issues.

## 2. Rollback Triggers
Rollback must be executed if one or more of the following occur:
- Backend service unavailable or repeatedly crashing
- Critical authentication/payment failures
- Major frontend routing failure in production
- Severe data integrity or security concern

## 3. Frontend Rollback (Vercel)
1. Open Vercel project -> Deployments.
2. Select last known stable deployment.
3. Promote/redeploy that version to Production.
4. Verify:
   - Home page loads
   - Login flow works
   - API requests reach backend

Expected recovery time: 5-10 minutes

## 4. Backend Rollback (Render)
1. Open Render service -> Events/Deployments.
2. Identify last stable commit deployment.
3. Trigger manual redeploy of that version.
4. Verify:
   - Service starts cleanly in logs
   - /api-docs reachable
   - critical endpoints return expected responses

Expected recovery time: 10-20 minutes

## 5. Environment Rollback
If issue is caused by wrong environment variables:
1. Restore last known correct variable values from secure team records.
2. Save environment settings.
3. Trigger redeploy.
4. Validate startup and key endpoints.

## 6. Secret Rotation Procedure
If secret/key exposure is suspected:
1. Revoke compromised keys/tokens immediately.
2. Generate new values (JWT/Stripe/Twilio/SMTP as needed).
3. Update platform environment variables.
4. Redeploy and retest all affected flows.

## 7. DNS Fallback (If Needed)
If domain mapping fails:
- Use platform default URLs temporarily (Vercel and Render service URLs).
- Fix DNS records in Namecheap.
- Re-validate SSL and propagation.

## 8. Post-Rollback Validation Checklist
- Frontend reachable
- Backend reachable
- Database connection healthy
- User login works
- Admin login works
- Listing retrieval works
- Payment flow behavior as expected

## 9. Communication Plan
- Notify all team members immediately when rollback starts.
- Log timestamp, root cause summary, and rollback version.
- Document final status after recovery.
