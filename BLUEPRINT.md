# Blueprint — Remote Ski Racing Video Analysis Platform

> **Audience:** Claude Code (autonomous coding agent)
> **Goal:** Build an MVP marketplace where parents of competitive ski racers upload run videos and receive paid annotated analysis from certified coaches.
> **Languages of the product:** English (default), German, French. Italian planned for phase 2.

---

## 1. Project context

### 1.1 What we are building

A two-sided marketplace:

- **Demand side:** parents and athletes (U10 → U21, plus adult masters) who film training/race runs and want expert technical feedback.
- **Supply side:** certified ski coaches (BE, DE, FIS, ÖSV, Swiss-Ski, USSA equivalents) who provide annotated video analyses for a fee.

The platform handles client onboarding, coach onboarding & vetting, video upload, coach-client matching by language and discipline, payment via Polar checkout, video annotation tooling, delivery, monthly coach payouts via Wise, and follow-up messaging.

### 1.2 Core constraints

- **International from day one.** UI, emails, legal pages, and content are localized in EN / DE / FR.
- **Coach-language matching is mandatory.** A German-speaking client must only see German-speaking coaches.
- **Videos are large** (200–500 MB typical, sometimes 4K) and contain minors → secure storage, signed URLs, GDPR-compliant retention.
- **Cross-border tax compliance is fully delegated to Polar** as Merchant of Record.
- **Strong seasonality.** Build with the assumption that traffic peaks Nov–April and drops 70 % in summer.

### 1.3 Payments architecture (read once, then move on)

Two **completely decoupled** systems:

- **Polar (Merchant of Record)** handles the inbound flow: client → platform. Polar absorbs the legal, tax, and fraud burden of selling globally. We pay Polar a flat fee per transaction; Polar handles all VAT/GST/sales tax.
- **Wise Business API** handles the outbound flow: platform → coach. Coaches are invoiced monthly via self-billing and paid by batch transfer in their local currency.

Polar doesn't know coaches exist. Wise doesn't know clients exist. The platform database is the only place that holds the full picture.

### 1.4 Non-goals for the MVP

- No native mobile app (mobile-responsive web only).
- No live video sessions (async only at launch).
- No in-house annotation editor — see §4.3 for the pragmatic approach.
- No Italian / Scandinavian languages yet.
- No subscription billing yet — pay-per-analysis only.
- No instant payouts to coaches — monthly batch only.
- No SEPA / Klarna / iDEAL — card-only at launch (Polar limitation, mitigations in §13.1).

---

## 2. Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend framework | **Next.js 14+ (App Router)** | i18n routing, SSR for SEO, Vercel-friendly |
| Styling | **Tailwind CSS** + shadcn/ui | Fast iteration, accessible defaults |
| Language | **TypeScript** everywhere | Mandatory |
| Backend | **Next.js Route Handlers** + **Server Actions** | Single repo, type-safe |
| Database | **PostgreSQL** via **Prisma** | Relational, strong typing |
| Auth | **Auth.js (NextAuth v5)** with email magic link + Google OAuth | Low friction for parents |
| Video storage & playback | **Mux** (preferred) or **Cloudflare Stream** | Adaptive streaming, signed playback URLs |
| Direct uploads | **Mux Direct Uploads** | Avoid passing 500 MB files through our backend |
| Payments (client → platform) | **Polar** via `@polar-sh/sdk` + `@polar-sh/nextjs` | MoR, handles VAT/GST/sales tax globally, ad-hoc pricing per coach |
| Payouts (platform → coaches) | **Wise Business API** (Batch Groups) | Multi-currency, mid-market FX, IBAN-friendly for EU coaches |
| i18n | **next-intl** | First-class App Router support, ICU messages |
| Email | **Resend** + **React Email** templates | DX, deliverability |
| File storage (non-video) | **Cloudflare R2** or **AWS S3** | Coach diplomas, profile pictures |
| Hosting | **Vercel** (web) + **Neon** or **Supabase** (Postgres) | Zero-ops MVP |
| Background jobs | **Inngest** or **Trigger.dev** | Email sending, Polar webhooks, Wise payout batches |
| Observability | **Sentry** + **Vercel Analytics** + **PostHog** | Errors, traffic, product analytics |

**Use the latest stable versions.** Do not pin old versions unless there's a known incompatibility.

---

## 3. Repository structure

```
/
├── apps/
│   └── web/                          # Next.js app
│       ├── src/
│       │   ├── app/
│       │   │   ├── [locale]/         # i18n root: en | de | fr
│       │   │   │   ├── (marketing)/
│       │   │   │   ├── (auth)/
│       │   │   │   ├── (client)/
│       │   │   │   ├── (coach)/
│       │   │   │   └── (admin)/
│       │   │   └── api/
│       │   │       ├── checkout/route.ts        # Polar Checkout handler
│       │   │       ├── webhooks/
│       │   │       │   ├── polar/route.ts       # Polar webhook receiver
│       │   │       │   └── mux/route.ts         # Mux webhook receiver
│       │   │       └── wise/                    # Wise integration helpers (server-only)
│       │   ├── components/
│       │   ├── lib/
│       │   │   ├── auth.ts
│       │   │   ├── db.ts             # prisma client
│       │   │   ├── polar.ts          # Polar SDK client
│       │   │   ├── wise.ts           # Wise API client
│       │   │   ├── mux.ts
│       │   │   └── i18n.ts
│       │   ├── server/               # tRPC routers or server actions
│       │   └── messages/             # i18n JSON: en.json, de.json, fr.json
│       └── prisma/
│           └── schema.prisma
├── packages/
│   ├── emails/                       # React Email templates (localized)
│   └── ui/                           # shared shadcn components
├── docs/
│   ├── ARCHITECTURE.md
│   ├── ONBOARDING_COACH.md           # ops playbook for vetting + Wise setup
│   ├── PAYOUTS.md                    # monthly Wise batch SOP
│   └── LEGAL.md                      # GDPR, COPPA, contractor agreement
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Use **pnpm** + **Turborepo** for the monorepo. Single workspace is fine if Turborepo feels heavy at first.

---

## 4. Domain model

### 4.1 Core entities (Prisma sketch — extend as needed)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  role          Role     @default(CLIENT) // CLIENT | COACH | ADMIN
  locale        String   @default("en")   // "en" | "de" | "fr"
  countryCode   String?  // ISO-3166-1 alpha-2
  polarCustomerId String? // set on first checkout (external_customer_id mapping)
  createdAt     DateTime @default(now())

  athletes      Athlete[]            // parent → athletes
  coachProfile  CoachProfile?
  ordersAsClient Order[]  @relation("ClientOrders")
}

model Athlete {
  id             String   @id @default(cuid())
  parentId       String
  parent         User     @relation(fields: [parentId], references: [id])
  firstName      String
  birthYear      Int
  ageCategory    AgeCategory      // U10..U21, MASTER
  fisCode        String?
  primaryDisc    Discipline       // SL | GS | SG | DH | SX | FREESTYLE
  parentalConsentAt DateTime?     // GDPR / COPPA
}

model CoachProfile {
  userId         String   @id
  user           User     @relation(fields: [userId], references: [id])
  bio            Json     // localized: { en: "...", de: "...", fr: "..." }
  languages      String[] // ["en", "de"]
  disciplines    Discipline[]
  certifications Certification[]   // verified by admin
  // --- Wise payout details ---
  wiseRecipientId String?           // Wise recipient account ID
  payoutCurrency  String            // "EUR" | "CHF" | "GBP" | "USD" | "NOK" | "SEK"
  ibanLast4       String?           // for display only
  payoutCountry   String            // ISO-3166-1 alpha-2
  taxId           String?           // VAT ID if applicable, for invoicing
  // --- Pricing ---
  baseRateCents  Int                // standard single-run analysis price in coach currency
  currency       String   @default("EUR")
  commissionRate Float    @default(0.20) // overridable per coach (e.g. ambassadors at 0)
  // --- State ---
  isActive       Boolean  @default(false)
  rating         Float?
  reviewCount    Int      @default(0)
}

model Order {
  id             String   @id @default(cuid())
  clientId       String
  client         User     @relation("ClientOrders", fields: [clientId], references: [id])
  athleteId      String
  coachId        String
  productType    ProductType   // SINGLE_RUN | SESSION_PACK
  status         OrderStatus   // PENDING_PAYMENT | PENDING_UPLOAD | UNDER_REVIEW | DELIVERED | REFUNDED | CANCELLED
  language       String        // language requested for the analysis
  discipline     Discipline
  // --- Money (always in client checkout currency) ---
  priceCents     Int           // gross paid by client (excl. tax — Polar handles tax)
  currency       String        // EUR | CHF | GBP | USD
  platformFeeCents Int         // our cut after Polar fees
  coachShareCents Int          // amount owed to coach (in coach payoutCurrency at lock-in FX)
  coachShareCurrency String
  // --- Polar reconciliation ---
  polarCheckoutId String?      @unique
  polarOrderId    String?      @unique
  // --- Lifecycle ---
  createdAt      DateTime @default(now())
  paidAt         DateTime?
  deliveredAt    DateTime?
  refundedAt     DateTime?

  uploads        VideoUpload[]
  delivery       Analysis?
  messages       Message[]
  payoutLine     PayoutLine?
}

model VideoUpload {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id])
  muxAssetId  String?
  muxPlaybackId String?
  status      UploadStatus // CREATED | UPLOADING | READY | ERRORED
  durationSec Int?
  filenameOriginal String?
  createdAt   DateTime @default(now())
}

model Analysis {
  id          String   @id @default(cuid())
  orderId     String   @unique
  coachNotes  String   // markdown
  deliveryMuxAssetId String?
  deliveryMuxPlaybackId String?
  rating      Int?     // client rating 1-5
  reviewText  String?
  createdAt   DateTime @default(now())
}

model Message { /* simple thread per order */ }

// --- Payouts to coaches (monthly Wise batches) ---
model PayoutBatch {
  id              String   @id @default(cuid())
  periodStart     DateTime // inclusive
  periodEnd       DateTime // exclusive
  status          PayoutBatchStatus // DRAFT | FUNDED | COMPLETED | FAILED
  wiseBatchGroupId String?
  totalCentsByCurrency Json  // { "EUR": 123400, "CHF": 45600 }
  createdAt       DateTime @default(now())
  fundedAt        DateTime?
  completedAt     DateTime?
  lines           PayoutLine[]
}

model PayoutLine {
  id              String   @id @default(cuid())
  batchId         String
  batch           PayoutBatch @relation(fields: [batchId], references: [id])
  coachId         String
  orderId         String   @unique
  order           Order    @relation(fields: [orderId], references: [id])
  amountCents     Int
  currency        String
  wiseTransferId  String?
  status          PayoutLineStatus // PENDING | SENT | FAILED
}
```

> Iterate freely as features emerge — but keep `Order` as the central transactional entity, and **never put coach payout state directly on `Order`** (use `PayoutLine`).

### 4.2 The matching logic

When a client opens the "Find a coach" page:

1. Filter coaches by `isActive = true`.
2. Filter by `languages` containing the client's chosen analysis language.
3. Filter by `disciplines` containing the requested discipline.
4. Optional filters: certification level, price range, average rating.
5. Sort by a quality score: `0.6 * rating + 0.2 * recency_of_last_delivery + 0.2 * fulfillment_rate`.

### 4.3 The annotation problem (read carefully)

Building an in-house video annotation editor (drawing arrows, ghost lines, slow-motion sync) is **a project of its own** and should **not** block the MVP.

**MVP approach:** the coach receives the client's video in our coach dashboard, uses **their own desktop tool** (Coach's Eye, Hudl Technique, OnForm, OBS Studio) to record their screen while playing the video and commenting in voice-over, then uploads the resulting MP4 back as the "delivery video".

The platform's job is to store & stream both videos, let the coach add markdown notes, and provide threaded follow-up messaging. **Phase 2** can introduce an integrated annotation tool. Don't waste MVP cycles here.

---

## 5. Internationalization

### 5.1 Routing

- URL pattern: `/{locale}/...` where locale ∈ {`en`, `de`, `fr`}.
- Default locale: `en`. Auto-detect from `Accept-Language` on first visit, persist choice in cookie + user profile.
- Always render a visible language switcher in the header.

### 5.2 Translation files

`apps/web/src/messages/{locale}.json`. Use ICU MessageFormat for plurals and gender. Group keys by feature (`auth`, `dashboard`, `checkout`, …).

### 5.3 What must be localized

- All UI strings, email templates, error and validation messages.
- Legal pages (Terms, Privacy, **Impressum** for DE/AT, contractor self-billing agreement for coaches).
- Marketing landing pages (handcrafted per locale, not just machine-translated).
- Coach bios — store as JSON `{ en, de, fr }`, fall back gracefully.

### 5.4 What is **not** localized

Dates of birth, FIS codes, brand name, logo, discipline codes (SL, GS, SG).

### 5.5 Currency display & checkout currency

- Detect country from IP at first visit. Map: AT/DE/FR/IT/BE/NL/ES/PT/EU → EUR; CH/LI → CHF; GB → GBP; US/CA → USD; everywhere else → EUR fallback.
- User can override in settings.
- **Do not do live FX conversion for display.** Set tier prices manually per currency, e.g. single run = 35 EUR / 35 CHF / 30 GBP / 39 USD.
- The Polar checkout currency is the **client display currency**. The coach is paid in their `payoutCurrency`; the platform locks in the FX rate at the moment of order paid (see §7.4).

---

## 6. Critical user flows

### 6.1 Client orders an analysis

1. Lands on localized homepage → "Get an analysis" CTA.
2. Sign up / sign in (magic link or Google).
3. Creates an Athlete profile (parental consent checkbox if athlete < 18).
4. Selects discipline, language, optional date constraint.
5. Browses matched coaches → opens coach profile → clicks "Book".
6. Selects product (single run / session pack).
7. Server creates a **Polar Checkout session** with ad-hoc pricing matching the coach's rate, and metadata `{ orderId, coachId, athleteId }`. Order created in DB with status `PENDING_PAYMENT`.
8. Client redirected to Polar-hosted checkout → completes payment.
9. Polar fires `order.paid` webhook → we move Order to `PENDING_UPLOAD` and email the client the upload link.
10. Client uploads video via Mux Direct Upload.
11. Mux fires `video.asset.ready` → Order transitions to `UNDER_REVIEW` → coach is notified.

### 6.2 Coach delivers an analysis

1. Coach receives email with link.
2. Coach dashboard shows pending order with playable input video.
3. Coach uses external tool to produce annotated MP4 + voice-over.
4. Coach uploads delivery video via Mux Direct Upload.
5. Coach writes optional markdown notes.
6. Coach hits "Deliver" → Order status `DELIVERED` → client notified.
7. A `PayoutLine` is created with the coach's share, ready to be picked up by the next monthly Wise batch.

### 6.3 Follow-up

- Threaded messaging on the order page for both sides.
- Client can rate 1–5 stars and leave a review.
- Order auto-closes 30 days after delivery; messages remain readable.

---

## 7. Payments (Polar)

### 7.1 Account setup

- Create a Polar **organization** in production + a separate one in sandbox.
- Generate an **Organization Access Token** for each environment → store as `POLAR_ACCESS_TOKEN`.
- Configure a webhook endpoint at `/api/webhooks/polar` with secret → `POLAR_WEBHOOK_SECRET`.
- Use the `@polar-sh/nextjs` package's `Webhooks` and `Checkout` route helpers — do not roll your own.

### 7.2 Product strategy: ad-hoc prices

We do **not** create one Polar Product per coach. That doesn't scale and clutters the dashboard.

Instead, we create a small number of **catalog products** representing analysis types (e.g. `single_run_analysis`, `session_pack_analysis`) with no fixed price, and use **ad-hoc prices** at checkout creation time to inject the actual coach-specific amount. This keeps the catalog clean and decouples coach pricing changes from Polar admin.

Sketch:

```ts
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_ENV === "production" ? "production" : "sandbox",
});

const checkout = await polar.checkouts.create({
  products: [process.env.POLAR_PRODUCT_SINGLE_RUN!],
  prices: {
    [process.env.POLAR_PRODUCT_SINGLE_RUN!]: [
      {
        amountType: "fixed",
        priceAmount: order.priceCents,
        priceCurrency: order.currency.toLowerCase(),
      },
    ],
  },
  externalCustomerId: user.id,
  customerEmail: user.email,
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/orders/${order.id}/upload?checkout_id={CHECKOUT_ID}`,
  metadata: {
    orderId: order.id,
    coachId: order.coachId,
    athleteId: order.athleteId,
    locale,
  },
});

// Persist polarCheckoutId on the Order
```

### 7.3 Webhook handling

Handle at minimum:

- `checkout.updated` — track checkout state for the success page.
- `order.created` — Polar order entity created (not yet paid).
- `order.paid` — money confirmed → transition our Order from `PENDING_PAYMENT` to `PENDING_UPLOAD`, send email with upload link, mark `paidAt`.
- `order.refunded` — full or partial refund → revert order state, notify both parties, void any associated `PayoutLine` not yet sent.
- `customer.created` / `customer.state_changed` — sync `polarCustomerId` to our `User`.

The `@polar-sh/nextjs` Webhooks helper provides typed handlers (`onOrderPaid`, `onOrderRefunded`, etc.). Use them.

```ts
// app/api/webhooks/polar/route.ts
import { Webhooks } from "@polar-sh/nextjs";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onOrderPaid: async (order) => { /* transition local Order */ },
  onOrderRefunded: async (order) => { /* refund flow */ },
  onCustomerStateChanged: async (state) => { /* sync */ },
  onPayload: async (payload) => { /* fall-through logging */ },
});
```

### 7.4 Locking in the coach's share

At the moment we receive `order.paid`, do the following inside one DB transaction:

1. Mark Order as paid.
2. Compute platform commission from `CoachProfile.commissionRate`.
3. Compute coach share = `priceCents - commission - polarFees`. Store the **estimated** Polar fee (4 % + 40 ¢ + applicable surcharges) — the exact net is reconciled monthly from Polar's payout reports.
4. Convert coach share from order currency to coach `payoutCurrency` using a Wise quote (read-only, no transfer yet) at lock-in FX. Persist `coachShareCents` and `coachShareCurrency` on the Order.

Step 4 is critical: locking the FX rate at order paid avoids exposing coaches to FX volatility between order and monthly payout.

### 7.5 Refund policy

- Full refund if coach hasn't delivered within 7 days of `paidAt`.
- Partial refund (50 %) if delivered late but accepted.
- Discretionary refunds via admin tool, with audit trail.
- Refunds are issued through the Polar dashboard or API → `order.refunded` webhook → reconcile.

Polar fees on the original transaction are **not refunded** to us. Account for this in P&L.

---

## 8. Coach payouts (Wise Business API)

### 8.1 Onboarding flow

During coach signup, after admin approval:

1. Coach is invited to add payout details on their dashboard.
2. We use **Wise's Recipient Accounts API** (`POST /v1/accounts`) to create a recipient owned by our business profile, using the coach's IBAN (or local routing details). Store the returned `wiseRecipientId` on `CoachProfile`.
3. Validate by sending a 0.01-unit micro-deposit (optional, recommended later).
4. Coach's profile becomes payout-ready. Until then, deliveries are still allowed but payouts queue up.

### 8.2 Monthly batch run

Run on the **5th of each month** for the previous month's deliveries:

1. Cron / Inngest job creates a `PayoutBatch` covering `[firstDayOfPrevMonth, firstDayOfThisMonth)`.
2. Aggregate all `Order` rows where `status = DELIVERED` and `deliveredAt` ∈ period and no existing `PayoutLine`.
3. Group by coach + payout currency. Each (coach, currency) tuple becomes a Wise transfer line.
4. Create a **Wise Batch Group** via `POST /v3/profiles/{profileId}/batch-groups`. Add transfers via `POST .../batch-groups/{id}/transfers` (each transfer requires a quote + recipient).
5. Mark batch as `FUNDED` after `POST .../batch-payments/{batchGroupId}/payments` with `type: "BALANCE"` (assumes platform Wise multi-currency balance is pre-funded).
6. As Wise webhooks confirm each transfer, update `PayoutLine.status` to `SENT`.

> Wise's Batch Groups API supports up to 1000 transfers per batch funded with a single pay-in. More than enough for the foreseeable future.

### 8.3 Coach invoicing

Because the platform is the seller of record, **coaches invoice the platform**, not the end clients. To keep this frictionless:

- The platform auto-generates a monthly **self-billing invoice (autofacturation / Gutschrift)** PDF on the coach's behalf, listing all delivered orders, gross amount, our retained commission, and net payout.
- Coach can download from dashboard. They sign a self-billing agreement at onboarding (legal: we need this in writing, locale-specific).
- For VAT-registered coaches in the EU, the invoice includes their VAT ID and applies reverse-charge B2B rules.

### 8.4 Wise pre-funding

The platform's Wise multi-currency balance must be funded ahead of the batch run. Recommended buffer: previous-month payouts × 1.2 in EUR, plus held balances per major non-EUR coach currency. Top up via SEPA from the platform's main bank account.

---

## 9. Video pipeline

### 9.1 Upload (client → us)

- Client UI calls our server → server creates a Mux Direct Upload → returns the upload URL.
- Client uploads directly to Mux (browser → Mux, never through our server).
- Mux fires `video.upload.asset_created` then `video.asset.ready` webhooks → we persist asset & playback IDs.

### 9.2 Playback (us → coach, us → client)

- Use **signed playback URLs** with short TTL (e.g. 4 hours) to prevent video sharing.
- Watermark playback for the coach with the order ID + coach name overlay.

### 9.3 Retention

- Default retention: **24 months** after order delivery.
- Allow user to request deletion at any time (GDPR Art. 17).
- Athlete videos must be deletable independently of account deletion if requested by parent.

---

## 10. Compliance & legal

> Treat this as load-bearing.

- **GDPR** (EU + UK GDPR): lawful basis is contract performance for transactional data, consent for marketing emails. Provide data export and erasure tools.
- **Minor athletes:** store explicit `parentalConsentAt` timestamp at athlete creation. Block analysis if missing.
- **COPPA** (US, < 13): for MVP, restrict US athletes to ≥ 13.
- **Imprint / Impressum:** required pages for Germany, Austria, Switzerland. Generate per locale.
- **Self-billing agreement:** mandatory for the coach payout model. Get a lawyer to draft EN/DE/FR versions.
- **Coach contractor agreement:** standard B2B services contract, IP assignment of analysis content, no-poach, refund liability share. Lawyer-reviewed before paid launch.
- **Right to image:** terms must explicitly grant the platform the right to use uploaded videos solely for fulfillment, never for marketing without separate consent.
- **Polar handles** sales tax compliance globally. We still need our own Terms, Privacy, and an EU-compliant cookie banner.

---

## 11. Build order (recommended sprints)

### Sprint 0 — Foundations (½ week)
- Repo scaffold, Next.js + Tailwind + Prisma + Auth.js working locally.
- CI on GitHub Actions: typecheck, lint, prisma validate.
- `next-intl` with placeholder strings in en/de/fr.
- Deploy a `Hello world` to Vercel staging.

### Sprint 1 — Auth & profiles (1 week)
- Magic-link + Google sign-in.
- User profile, locale & currency preferences.
- Athlete CRUD with parental consent gate.
- Coach profile shell (no public listing yet).

### Sprint 2 — Coach onboarding & admin (1 week)
- Coach signup with multi-step form: bio (per locale), languages, disciplines, certifications upload to R2/S3.
- **Wise recipient creation** flow (collect IBAN + account holder name + country, call Wise Recipient Accounts API, store `wiseRecipientId`).
- Admin dashboard to review and approve coaches.
- Public coach directory + coach detail page.

### Sprint 3 — Polar integration & ordering (1.5 weeks)
- Create catalog products in Polar (sandbox first): `single_run_analysis`, `session_pack_analysis`.
- Server action to create Order + Polar Checkout session with ad-hoc price.
- Polar webhook handler at `/api/webhooks/polar`: `order.paid`, `order.refunded`, `customer.*`.
- Order state machine wired up.
- Wise quote at `order.paid` to lock in coach share FX.

### Sprint 4 — Video upload & coach delivery (1.5 weeks)
- Mux Direct Upload from the client side (post-payment).
- Coach inbox with playback (signed URLs).
- Coach delivery upload + markdown notes.
- Order state transitions + email notifications via Resend.
- Create `PayoutLine` on delivery.

### Sprint 5 — Reviews & messaging (1 week)
- Threaded messages per order.
- Rating + review post-delivery.
- Email digests for both sides.

### Sprint 6 — Wise batch payouts (1 week)
- Inngest scheduled job for monthly batch creation.
- Wise Batch Group creation, funding, and transfer status sync.
- Coach self-billing invoice PDF generation (use `@react-pdf/renderer`).
- Admin tool to inspect / re-run batches.

### Sprint 7 — Polish & launch prep (1 week)
- All emails localized.
- Legal pages per locale (Terms, Privacy, Imprint, Self-billing agreement).
- Cookie banner (Klaro or similar).
- Sentry, PostHog, error pages.
- Soft-launch checklist (see §13).

**Total: ~8–9 weeks of focused work** for a credible MVP with one developer. Add 30–50 % buffer.

---

## 12. Environment variables

Create `.env.example` with at minimum:

```
# Database
DATABASE_URL=

# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email
RESEND_API_KEY=

# Polar (payments inbound)
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_ENV=sandbox            # sandbox | production
POLAR_PRODUCT_SINGLE_RUN=    # product UUID
POLAR_PRODUCT_SESSION_PACK=  # product UUID

# Wise (payouts outbound)
WISE_API_TOKEN=
WISE_PROFILE_ID=
WISE_ENV=sandbox             # sandbox | production
WISE_WEBHOOK_PUBLIC_KEY=     # for signature verification

# Mux
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_WEBHOOK_SECRET=

# Storage
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=

# Observability
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=

# App
NEXT_PUBLIC_APP_URL=
DEFAULT_LOCALE=en
SUPPORTED_LOCALES=en,de,fr
```

Never commit real keys. Use Vercel env scopes (development / preview / production) and Polar/Wise sandbox tokens until you go live.

---

## 13. Soft-launch checklist (don't skip)

- [ ] All three locales render every page without missing-key warnings.
- [ ] Test order completed end-to-end in each locale with a real test coach (Polar sandbox).
- [ ] Polar VAT lines correct for AT, DE, FR, CH, GB, US sample addresses (Polar dashboard has tax preview).
- [ ] Refund flow tested via Polar dashboard → webhook received → Order reverted → PayoutLine voided.
- [ ] Mux upload works on Safari iOS.
- [ ] Wise sandbox: create recipient → quote → batch group → fund → confirm transfer received in target sandbox account.
- [ ] Self-billing invoice PDF renders correctly in EN/DE/FR with VAT reverse-charge wording.
- [ ] Email deliverability checked: SPF, DKIM, DMARC set up on the sending domain.
- [ ] GDPR export & deletion endpoints functional.
- [ ] Impressum live on `/de/impressum`.
- [ ] Cookie consent gates all analytics.
- [ ] Sentry receiving errors from production build.
- [ ] Status page / uptime monitoring.
- [ ] Backup of production DB scheduled.

### 13.1 Card-only payment risk mitigation (DACH-specific)

Polar processes cards only — no SEPA, no Klarna, no iDEAL. In the German-speaking market, this reduces conversion vs. competitors offering SEPA. Mitigations:

- Make the price clear and below the typical card-anxiety threshold (single-run < €50).
- Display "Visa / Mastercard / Amex / Apple Pay / Google Pay" badges on the booking page so users don't expect SEPA.
- For session packs > €100, add a copywriting line: "Secure payment by card — receipt with VAT details delivered by email."
- Track `checkout.expired` events in PostHog; if abandonment is > 30 % in DACH, prioritize an alternative inbound method (e.g. add a parallel SEPA-via-GoCardless flow).

---

## 14. Things explicitly out of scope for the MVP

- Mobile native apps.
- In-browser annotation editor.
- Live 1:1 video coaching.
- Group/club B2B portal.
- AI pose detection.
- Subscription billing on Polar.
- Italian, Norwegian, Swedish locales.
- Instant coach payouts.
- Non-card payment methods (SEPA / Klarna / iDEAL).

Do not let scope creep pull these in. When in doubt, cut.

---

## 15. Coding conventions for this repo

- **TypeScript strict mode on.** No `any` without an explicit `// reason: ...` comment.
- **Server actions** preferred over API routes for form submissions inside the App Router. Webhooks remain Route Handlers.
- **Zod** for all input validation (forms, API, env, webhook payloads not already typed by SDK).
- **ESLint + Prettier**, pre-commit hook with Husky + lint-staged.
- **Prisma migrations** committed; never `db push` to production.
- **Conventional Commits** for git history.
- **Feature folders**, not type folders — colocate component, hook, server action, and tests.
- **i18n keys** must be created at the same time as the component; never ship hardcoded strings.
- **Money** stored as integer cents + currency string. Never use floats for money. Never mix currencies in a single computation without an explicit FX step.
- **Idempotency keys** on every Polar checkout creation and every Wise transfer creation, derived from our internal `Order.id` / `PayoutLine.id`.

---

## 16. Open questions for the human owner

Surface these early; don't guess:

1. Final brand name and primary domain (must work in EN/DE/FR).
2. Exact commission rate per coach tier (default 20 % proposed).
3. Reference list of 5–10 launch ambassador coaches per language.
4. Legal entity that will sign Terms + hold the Polar org + hold the Wise Business account.
5. Which jurisdiction governs the Terms (likely the company's home).
6. Visual identity assets (logo, colors, typography) — required before Sprint 7.
7. Confirmation of pre-funding strategy for the Wise multi-currency balance (initial float requirement).

---

**End of blueprint.** Build iteratively, ship the smallest credible slice first (one locale + one coach + one paid order + one delivered analysis = success), then widen.
