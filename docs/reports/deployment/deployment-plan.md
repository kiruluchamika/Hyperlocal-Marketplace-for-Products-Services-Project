# Deployment Plan

## 1. Document Control
- Project: Hyperlocal Marketplace for Products and Services (Bazaaro)
- Module: SE3040 - Application Frameworks
- Report Type: Deployment Plan
- Version: v1.0.0-beta
- Date: 2026-04-11

## 2. Objective
Deploy the full-stack system to production with:
- Frontend on Vercel
- Backend on Render
- Database on MongoDB Atlas
- Custom domains: www.bazaro.online and api.bazaro.online

## 3. Target Architecture
- Client browser -> Frontend (Vercel)
- Frontend -> Backend REST API (Render)
- Backend -> MongoDB Atlas
- Backend -> Stripe/Twilio/Google APIs (as configured)

## 4. Platform Selection
- Frontend Platform: Vercel (best fit for React + Vite and fast CDN delivery)
- Backend Platform: Render Web Service (managed Node.js service)
- Database: MongoDB Atlas (managed cloud MongoDB)
- DNS Provider: Namecheap

## 5. Pre-Deployment Prerequisites
- GitHub repository is up to date on main branch
- Render account connected to GitHub
- Vercel account connected to GitHub
- MongoDB Atlas cluster and user ready
- Stripe test/production keys ready
- Domain bazaro.online configured in Namecheap

## 6. Deployment Steps

### 6.1 Backend Deployment (Render)
1. Create new Web Service from GitHub repository.
2. Select branch: main.
3. Set Root Directory: backend.
4. Set Build Command: npm install && npm run build.
5. Set Start Command: npm start.
6. Add backend environment variables from environment-config.md.
7. Deploy service.
8. Verify API docs endpoint: /api-docs.

### 6.2 Backend Domain Mapping
1. In Render service settings, add custom domain api.bazaro.online.
2. Copy Render-provided CNAME target.
3. In Namecheap, create CNAME record for api -> Render target.
4. Wait for DNS propagation and SSL issuance.

### 6.3 Frontend Deployment (Vercel)
1. Import repository into Vercel.
2. Set project Root Directory: frontend.
3. Framework preset: Vite.
4. Build Command: npm run build.
5. Output Directory: dist.
6. Add frontend environment variables from environment-config.md.
7. Deploy project.

### 6.4 Frontend Domain Mapping
1. In Vercel project settings, add domains:
   - bazaro.online
   - www.bazaro.online
2. Add/adjust Namecheap DNS records to Vercel targets.
3. Confirm SSL is active and routing is correct.

## 7. Validation Plan
- Open live frontend URL and verify home page.
- Open backend API docs URL.
- Verify login/register flow.
- Verify listing browsing and detail pages.
- Verify service booking pages.
- Verify admin login and admin dashboard access.
- Verify payment flow behavior (enabled/disabled settings).

## 8. Deployment Risks and Mitigations
- Risk: Missing env vars causes backend startup failure.
  - Mitigation: Validate all required vars before deployment.
- Risk: DNS delay causes temporary 404/SSL errors.
  - Mitigation: Allow propagation time and re-check records.
- Risk: Free tier cold starts increase latency.
  - Mitigation: Document expected behavior for evaluation.
- Risk: SPA direct-route 404 on frontend.
  - Mitigation: Ensure Vercel rewrites are configured.

## 9. Deliverables
- Deployed backend URL
- Deployed frontend URL
- API documentation URL
- Deployment report with evidence screenshots
- Post-deployment checklist with test results
