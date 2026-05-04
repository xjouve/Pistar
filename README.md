# Pistar

Remote video analysis platform connecting families of competitive ski racers to certified coaches across borders and languages.

> **Status:** MVP in active build (Sprint 0 — Foundations).
> **Spec:** [`BLUEPRINT.md`](./BLUEPRINT.md) (technical/business) · [`BRAND_BRIEF.md`](./BRAND_BRIEF.md) (visual identity).

---

## Stack

- **Frontend / backend:** Next.js 14 (App Router), TypeScript strict, Tailwind, shadcn/ui
- **Auth:** Auth.js v5 (email magic link + Google)
- **DB:** PostgreSQL via Prisma
- **i18n:** `next-intl` (en / de / fr)
- **Video:** Mux (direct uploads + signed playback)
- **Payments inbound:** Polar (Merchant of Record)
- **Payouts outbound:** Wise Business API (monthly batch groups)
- **Email:** Resend + React Email
- **Hosting:** Vercel (web) + Neon / Supabase (Postgres)
- **Monorepo:** pnpm + Turborepo

## Local development

Requires **Node 20+**, **pnpm 8+**.

```bash
pnpm install
cp .env.example apps/web/.env.local   # fill in values
pnpm --filter web dev
```

App runs at <http://localhost:3000>. The default locale is English; visit `/de` or `/fr` to test localizations.

## Repository layout

```
apps/
  web/                 Next.js app (UI + API routes + server actions)
packages/
  emails/              React Email templates (localized)
  ui/                  Shared shadcn-derived components
docs/                  Operational docs (onboarding, payouts, legal)
```

See [`BLUEPRINT.md` §3](./BLUEPRINT.md#3-repository-structure) for the full structure.

## License

UNLICENSED — proprietary, all rights reserved.
