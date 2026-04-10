# Deployment Report

## 1. Document Control
- Project: Hyperlocal Marketplace for Products and Services (Bazaaro)
- Module: SE3040 - Application Frameworks
- Report Type: Deployment Report
- Version: v1.0.0-beta
- Date: 2026-04-11

## 2. Deployment Summary
The project was deployed as a split full-stack architecture:
- Frontend deployed on Vercel
- Backend deployed on Render
- MongoDB hosted on Atlas
- Production domains configured:
  - Frontend: https://www.bazaro.online
  - Backend: https://api.bazaro.online

## 3. Backend Deployment Execution
Platform: Render (Web Service)
- Root Directory: backend
- Build Command: npm install && npm run build
- Start Command: npm start
- Branch: main

Result:
- Deployment completed successfully.
- Backend service reachable via custom domain.
- Swagger/API docs endpoint accessible.

Evidence to attach:
- Screenshot: Render service overview with successful deployment
- Screenshot: Render logs showing server started
- Screenshot: API docs page on production URL

## 4. Frontend Deployment Execution
Platform: Vercel
- Root Directory: frontend
- Framework: Vite
- Build Command: npm run build
- Output Directory: dist

Result:
- Deployment completed successfully.
- Frontend reachable via custom domain.
- Production routes load correctly.

Evidence to attach:
- Screenshot: Vercel deployment success
- Screenshot: Frontend live home page
- Screenshot: Admin/login route working directly

## 5. Domain and DNS Configuration
DNS Provider: Namecheap
- bazaro.online -> Vercel
- www.bazaro.online -> Vercel
- api.bazaro.online -> Render

Result:
- SSL certificates issued successfully.
- Both frontend and backend domains resolve over HTTPS.

Evidence to attach:
- Screenshot: Namecheap DNS records
- Screenshot: Vercel domain settings
- Screenshot: Render custom domain settings

## 6. Runtime Configuration and Environment Variables
- Backend and frontend environment variables configured in platform dashboards.
- Secrets were not committed to repository.
- See environment-config.md for complete variable list.

## 7. Post-Deployment Verification
Functional checks performed:
- Frontend loads from production domain.
- Backend API docs endpoint loads.
- User authentication flow works.
- Product listing browse/details works.
- Service booking views work.
- Admin login and dashboard access works.
- Payment behavior follows runtime payment toggle.
- Maintenance mode behavior works for admin/non-admin roles.

## 8. Issues Encountered and Resolutions
1. Issue: Direct route 404 on frontend
- Cause: SPA fallback rewrite missing
- Resolution: Added Vercel rewrite configuration for client-side routes

2. Issue: Maintenance redirect loop during testing
- Cause: Redirect logic ran before settings state stabilized
- Resolution: Updated frontend maintenance flow and admin exceptions

3. Issue: Browser native confirm dialogs inconsistent
- Cause: window.confirm used in UI actions
- Resolution: Replaced with custom modal component

4. Issue: Modal clipping in navbar context
- Cause: Stacking/transform context conflict
- Resolution: Render modal via portal to document body

## 9. Current Deployment Status
- Frontend status: Active
- Backend status: Active
- Database status: Connected
- Domains: Configured and reachable

## 10. Live URLs
- Frontend: https://www.bazaro.online
- Backend API: https://api.bazaro.online
- API Docs: https://api.bazaro.online/api-docs
- Repository: https://github.com/kiruluchamika/Hyperlocal-Marketplace-for-Products-Services-Project

## 11. Compliance with Assignment Deployment Requirements
- Backend deployed on cloud platform: Yes (Render)
- Frontend deployed on cloud platform: Yes (Vercel)
- Deployment section with setup details: Yes
- Environment variables documented without secrets: Yes
- Live URLs included: Yes
- Evidence screenshots included: To be attached in final submission bundle
