# AGENTS.md — liwip-bgv-client

Worker-facing Next.js app for the Liwip background-verification platform. Workers sign in with OTP, give consent, submit their details and documents, and track the live state of their checks.

## Design

**Read [DESIGN.md](DESIGN.md) before any UI work.** It holds the design system: tokens, the five verification states, type, forms, flow, writing and accessibility rules, and the mobile onboarding patterns (screen shell, OTP, passkeys, consent). It overrides any default styling habit, including shadcn defaults.

Keep `DESIGN.md` and the tokens in `app/globals.css` in sync. If you change a value in one, change it in the other in the same commit.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4 through `@tailwindcss/postcss`, plus `tw-animate-css`
- shadcn/ui, `base-nova` style on `@base-ui/react` (not Radix), components in `components/ui/`
- `lucide-react` icons, `zod` validation, `class-variance-authority` for variants
- `motion` for screen-to-screen transitions only (`DESIGN.md` §8)

## Commands

Use pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3005
pnpm typecheck
pnpm lint
pnpm build
pnpm start        # production server on 3100
```

Run `pnpm typecheck` and `pnpm lint` before calling a change done. Run `pnpm build` for anything touching config, routes or `globals.css`.

The backend is the sibling repo `../liwip-bgv-apis` (NestJS verification API). Start it with `npm run dev:api`; the client expects it at `VERIFICATION_API_URL` (default `http://localhost:3001`).

## Routes

- `/` — the mobile onboarding (`components/onboarding/`): entry, language, mobile, OTP, number verified, quick sign-in, worker home, choose work, package, consent, and the returning screens. It runs on the placeholder service in `lib/onboarding/service.ts` and is not connected to the API yet.
- `/apply` — the previous worker journey (`components/portal-root.tsx`, `worker-portal.tsx`). It still serves the steps after consent until they are rebuilt. DigiLocker and Aadhaar return here.

### Onboarding test mode

`NEXT_PUBLIC_ONBOARDING_TEST_MODE` lets reviewers tap through every screen without typing: blocked buttons stay enabled and empty answers fall back to demo values. It is on by default in development and off in production unless set to `true`. Set it to `false` to test validation locally. A "Test mode" tag shows on screen while it is on.

In development, `?step=<screen>` opens any screen directly with demo data (`otp`, `home`, `package`, `consent`, `returning`, …), `?entry=light` shows the light entry (2a) instead of the default dark one (1b), and `?returning=r1` shows R1 instead of R1b.

## Structure

```text
app/
  api/                 Server-only routes: auth/OTP, applications, documents, DigiLocker, Aadhaar OVSE, retries
  globals.css          Design tokens and all portal styles
  layout.tsx           Fonts (Geist, Geist Mono), metadata, skip link
components/
  ui/                  shadcn primitives, edited to the Liwip system
  onboarding/          New mobile onboarding: shell, screens, Gig Card, flow
  state-badge.tsx      The five verification states as badges
  portal/              Previous landing and home surfaces (served at /apply)
  primitives.tsx       Shared form, status and feedback components
  worker-portal.tsx    Journey state, submission and connected screens
lib/
  backend.ts           Backend request helper (server only)
  session.ts           Signed worker session
  steps.ts             Journey step definitions
  types.ts             API and domain types, including verification statuses
  i18n.ts              String table (English only today)
  onboarding/          Onboarding content, placeholder service, test-mode flag
  worker-config.ts     Draft defaults, occupations, package fallbacks
screenshots/           Local review captures
```

## Rules for this codebase

- **The browser talks only to `app/api/*`.** Never call the backend or a provider from client code, and never expose `VERIFICATION_API_KEY`, session secrets or provider tokens to the browser.
- Map API statuses onto the five design states using the table in `DESIGN.md` §2. Never render a raw API status.
- Prefer the components in `components/ui/` and the utilities `.label-mono` and `.tabular` over new one-off CSS.
- When adding a shadcn component with the CLI, check it against `DESIGN.md` §12 before use: remove radius and shadows, set mono uppercase labels, keep 48px minimum height.
- Don't put secrets in `.env.example`. Real values go in `.env.local`, which is gitignored.

## Working agreements

- Work in this checkout. Do not create git worktrees.
- Do UI work on a feature branch, not `main`.
- Keep a version when doing a substantial redesign so earlier directions stay comparable.
