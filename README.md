# LIWIP BGV Worker Portal

Worker-facing Next.js application for the LIWIP background-verification platform. The browser collects worker details and calls only local server routes; provider credentials remain on the server.

## What works

- Mobile OTP development flow with an HTTP-only signed worker session
- Role and package selection
- Purpose-specific consent collection
- Personal, address, identity, vehicle, employment, skills and reference forms
- Selfie, ID-card and optional e-Aadhaar uploads
- Review, payer selection and case submission
- Live application/check status polling
- Retry for failed or manual-review checks
- Focused 17-step MVP journey ending at live status and issue resolution

The MVP excludes Gig Card issuance, profile sharing, renewal, privacy-request and support-ticket pages until their backend services exist.

## Structure

```text
app/
  api/                    Server-only routes to authentication and the BGV backend
  globals.css             Shared product and portal styles
components/
  portal/product-home.tsx Focused worker-verification landing page
  primitives.tsx          Reusable form, status and feedback components
  worker-portal.tsx       Journey state, submission and connected screens
lib/
  backend.ts              Backend request helper
  session.ts              Signed worker session utilities
  steps.ts                Active MVP workflow definition
  types.ts                API and worker-domain types
  worker-config.ts        Draft defaults, occupations and package fallbacks
```

## Local setup

Prerequisites:

- Node.js 20+
- The backend repository at `C:\keystone\Gig Verfication\liwip-bgv-backend`
- PostgreSQL and Redis used by that backend

1. Copy `.env.example` to `.env.local` and set a strong session secret.
2. Start the backend on port 3001. Port 3000 is intentionally avoided because another local Keystone app may use it.

```powershell
cd "C:\keystone\Gig Verfication\liwip-bgv-backend"
npm.cmd run dev:api
```

3. Start this UI on port 3100.

```powershell
cd "C:\keystone\Gig Verfication\liwip-bgv-worker-portal"
npm.cmd install
npm.cmd run dev
```

4. Open `http://localhost:3100`. The local OTP is `417206` unless changed in `.env.local`.

## Request path

```text
Worker browser
  → Next.js UI
  → Next.js server API routes (session + backend API key)
  → NestJS verification API
  → BullMQ / Redis
  → Verification workers
  → Surepass provider adapter
  → Surepass Sandbox
  → Normalized result in PostgreSQL
  → NestJS status API
  → Next.js server API route
  → Live worker case tracker
```

The browser never receives `VERIFICATION_API_KEY`, the Surepass bearer token, or the Surepass customer ID.

## Verification commands

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```
