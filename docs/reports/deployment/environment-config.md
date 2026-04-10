# Environment Configuration

## 1. Security Note
This document includes variable names, purpose, and masked examples only.
Do not commit real secrets to GitHub.

## 2. Backend Environment Variables (Render)

| Variable | Required | Purpose | Example (Masked) |
|---|---|---|---|
| PORT | Yes (platform) | Runtime port for Node server | Assigned by Render |
| MONGODB_URI | Yes | Main MongoDB Atlas connection | mongodb+srv://user:***@cluster... |
| MONGODB_FALLBACK_URI | No | Optional fallback Mongo URI | mongodb://localhost:27017/db |
| MONGODB_SERVER_SELECTION_TIMEOUT_MS | Yes | DB connection timeout | 10000 |
| MONGODB_IP_FAMILY | Yes | DNS/IP family for Mongo client | 4 |
| JWT_SECRET | Yes | JWT signing secret | *** |
| JWT_EXPIRES_IN | Yes | JWT expiry period | 7d |
| GOOGLE_CLIENT_ID | Optional | Google login validation | ***.apps.googleusercontent.com |
| STRIPE_SECRET_KEY | Yes | Stripe server-side operations | sk_live_*** |
| STRIPE_PUBLISHABLE_KEY | Yes | Stripe key reference for config | pk_live_*** |
| STRIPE_WEBHOOK_SECRET | Yes | Stripe webhook signature verification | whsec_*** |
| STRIPE_CONNECT_ENABLED | Optional | Enable Stripe Connect features | true |
| STRIPE_CONNECT_RETURN_URL | Optional | Connect callback URL | https://www.bazaro.online/... |
| STRIPE_CONNECT_REFRESH_URL | Optional | Connect refresh URL | https://www.bazaro.online/... |
| STRIPE_PAYMENT_CURRENCY | Optional | Default payment currency | LKR |
| STRIPE_TRANSFER_FEE_PERCENT | Optional | Platform fee percent | 5 |
| STRIPE_BALANCE_TO_LKR_RATE | Optional | Currency conversion helper | 300 |
| ENABLE_OTP_DELIVERY | Optional | OTP delivery flow toggle | true |
| OTP_EXPIRY_MINUTES | Optional | OTP expiration time | 30 |
| CURRENCY | Optional | Default application currency | LKR |
| TWILIO_ACCOUNT_SID | Optional | Twilio account ID | AC*** |
| TWILIO_AUTH_TOKEN | Optional | Twilio auth token | *** |
| TWILIO_VERIFY_SERVICE_SID | Optional | Twilio Verify service | VA*** |
| SMTP_HOST | Optional | SMTP server host | smtp.example.com |
| SMTP_PORT | Optional | SMTP server port | 587 |
| SMTP_SECURE | Optional | SMTP TLS mode | false |
| SMTP_USER | Optional | SMTP username | *** |
| SMTP_PASS | Optional | SMTP password | *** |
| SMTP_FROM_EMAIL | Optional | Sender email | noreply@bazaro.online |
| SMTP_FROM_NAME | Optional | Sender name | Bazaaro |

## 3. Frontend Environment Variables (Vercel)

| Variable | Required | Purpose | Example (Masked) |
|---|---|---|---|
| VITE_GOOGLE_CLIENT_ID | Yes | Google login client integration | ***.apps.googleusercontent.com |
| VITE_SOCKET_URL | Yes | Socket server endpoint | https://api.bazaro.online |
| VITE_STRIPE_PUBLISHABLE_KEY | Yes | Stripe client key | pk_live_*** |

## 4. Configuration Rules
- Never hardcode secrets in source code.
- Keep backend and frontend variables in platform dashboards.
- Rotate leaked credentials immediately.
- Ensure client-side VITE_ vars never contain secret server values.

## 5. Verification Steps
- Backend starts successfully without env validation errors.
- MongoDB connection succeeds.
- Auth and payment endpoints function.
- Frontend builds and calls correct backend URL.
