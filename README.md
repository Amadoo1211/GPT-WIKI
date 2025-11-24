# GPT-Wiki PRO
Premium Chrome extension + Express backend for GPT-powered chat, deep research, authentication, billing, and credit tracking.

## Project Structure
```
backend/          # Express + Prisma + Stripe backend
  src/
    server.js
    routes/
    controllers/
    services/
    middlewares/
    db/
  prisma/schema.prisma
  .env.example
extension/        # Chrome extension (Manifest v3)
  manifest.json
  popup.html / popup.js
  sidebar.html / sidebar.js
  background.js
  styles/
shared/           # Shared helpers
  utils/
  types/
```

## Backend Setup
1. Install dependencies:
   ```bash
   npm --prefix backend install
   npm run backend:prisma:generate
   ```
2. Copy environment variables:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Fill in Postgres, OpenAI, Stripe, SMTP, and Google credentials.
3. Run locally:
   ```bash
   npm run backend:dev
   ```
4. Database migrations (after editing schema):
   ```bash
   npx --prefix backend prisma migrate dev --name init
   ```

### Deploying to Railway
1. Create a new Railway project and add a Postgres database. Copy its `DATABASE_URL`.
2. Add environment variables from `.env.example` to the Railway service (including `PORT`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`, `CLIENT_URL`, `ALLOWED_ORIGINS`, `GOOGLE_CLIENT_ID`, SMTP values, and credit settings).
3. Set the start command to `npm --prefix backend run start`.
4. Deploy. After deployment, configure Stripe webhook to point to `https://<railway-domain>/billing/webhook`.
5. Run `npx prisma migrate deploy` via a Railway shell or deploy hook to apply migrations.

### API Endpoints
- `POST /auth/login` – send magic link to email
- `GET /auth/login?token=...&email=...` – confirm magic link and return JWT
- `POST /auth/google` – verify Google ID token and return JWT
- `GET /auth/google/client-id` – expose configured Google client ID for the extension
- `GET /users/me` – authenticated user profile
- `POST /billing/create-checkout-session` – Stripe Checkout (credit pack or subscription)
- `POST /billing/webhook` – Stripe webhook handler
- `POST /chat` – GPT-4o-mini chat (deducts credits)
- `POST /deep-research` – multi-step research + summary (deducts credits)

## Chrome Extension
### Load in Chrome
1. Build assets (none required) and ensure backend `API_BASE` in `extension/background.js` and `extension/popup.js` points to your backend URL.
2. Visit `chrome://extensions`, enable Developer Mode, click **Load unpacked**, and select the `extension/` folder.
3. Pin the extension. Click the action icon to open the popup or the sidebar.

### Features
- Popup: Magic Link login, Google Sign-In, credit display, purchase buttons, open sidebar, logout.
- Sidebar: Chat interface, Deep Research, Summarize Page, Ask GPT-Wiki quick action, credit refresh, loading indicator.
- Background service worker: stores JWT + user in `chrome.storage.local`, proxies authenticated API calls, opens the side panel.

## Notes
- Update `ALLOWED_ORIGINS` to include your Chrome extension ID (`chrome-extension://<id>`).
- Stripe credit and subscription prices are configured via `STRIPE_PRICE_CREDIT_PACK`, `STRIPE_PRICE_SUBSCRIPTION`, `CREDIT_PACK_AMOUNT`, and `SUBSCRIPTION_CREDIT_AMOUNT`.
- Magic link emails are delivered via SMTP; ensure credentials are valid in production.
