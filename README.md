# Crossbench

> **Australian civic tech platform — vote on real federal parliamentary bills and see live electorate sentiment.**

🌐 **Live:** [crossbench.io](https://crossbench.io)

Crossbench bridges the gap between Australian citizens and their parliament. Citizens can sign up, verify their address to their electorate, and cast Support / Oppose / Abstain votes on actual bills currently before—or passed through—the federal legislature. MPs and Senators get a paid constituent-sentiment dashboard giving them real-time insights from the people they represent.

---

## Features

### For Citizens (free)
- **Magic-link sign-in** — passwordless email authentication via Resend, no passwords stored
- **Address verification** — autocomplete powered by Nominatim/OSM geocoding; PostGIS spatial query maps your address to your exact electorate
- **Vote on bills** — Support, Oppose, or Abstain with an optional comment (max 1 000 chars); closed/lapsed bills are read-only
- **Citizen dashboard** — personal vote history with electorate context
- **Bills browser** — paginated, tabbed (Before Parliament / Passed / Not Passed), chamber filter, text search, sortable
- **Bill detail pages** — AI plain-English summary (Claude), APH description, committee referrals, live vote tally bars, parliamentary progress timeline, division data (party breakdown + member-level votes), outcome banner
- **Bill tags** — chamber, status, portfolio, amendments, reading count
- **Parliament listing** — all 227 MPs and Senators with party filter and profile photos
- **Electorate directory** — 151+ electorates with per-electorate constituent sentiment
- **MP profile pages** — constituent sentiment bars, bill-by-bill local vs national comparison
- **Statistics dashboard** — bills passed/total, pass rate, median days, donut chart, origin chart, parliament composition, voice vote vs division breakdown, fastest / slowest / most-contested bills

### For MPs & Senators (paid)
- **Constituent sentiment dashboard** — live Support / Oppose / Abstain breakdown per bill, filtered to their electorate
- **Auto-detected** via `@aph.gov.au` email domain on sign-up
- **30-day free trial**, then Pro **$199/mo** or Team **$499/mo**
- Subscription management via Stripe Customer Portal

### Support & Admin
- Ticket submission with **Google reCAPTCHA v3** protection
- **AI support chat** (Claude Haiku, 10-message context window)
- **Admin panel** — separate cookie-authenticated login; manage users, votes, bills, MPs, support tickets, and marketing

### Data Pipeline
- TypeScript + Python scripts that scrape APH, consume the TheyVoteForYou API, enrich bill records, generate AI summaries, import MP data, and ingest division results

---

## Tech Stack

- **Framework:** Next.js 16.2.3 (App Router) · React 19 · TypeScript 5
- **Database:** PostgreSQL with PostGIS extension (spatial electorate lookups)
- **ORM:** Prisma 7 with `@prisma/adapter-pg`
- **Auth:** NextAuth v5 — magic-link email flow via Resend
- **Payments:** Stripe (Checkout, Customer Portal, webhooks) — Pro $199/mo, Team $499/mo
- **AI:** `@anthropic-ai/sdk` — Claude Sonnet (bill summaries) + Claude Haiku (support chat)
- **Styling:** Tailwind CSS v4
- **Rendering:** `react-markdown`
- **Testing:** Playwright (end-to-end)
- **Analytics:** Plausible + Vercel Analytics
- **External APIs:** APH website (scraping), TheyVoteForYou API, Nominatim/OSM geocoding, Google reCAPTCHA v3

---

## Data Model

### Core models (Prisma / PostgreSQL)

**`User`**
- `id`, `email` (unique), `role` (`CITIZEN` | `MP` | `ADMIN`)
- `verificationStatus` (`NONE` | `EMAIL` | `ADDRESS` | `IDENTITY`)
- `electorateId` → FK to `Electorate`
- `addressHash`, `addressChangeCount`, `lastAddressChangeAt`
- `subscriptionStatus` (`TRIAL` | `ACTIVE` | `PAST_DUE` | `CANCELLED`)
- `subscriptionTier` (`FREE` | `PRO` | `TEAM`)
- `stripeCustomerId`, `subscriptionId`, `trialEndsAt`

**`Electorate`**
- `id`, `name` (unique), `state`
- `mpName`, `mpParty`, `mpEmail`, `mpPhotoUrl`, `mpChamber`, `mpId`
- PostGIS boundary column (spatial queries)

**`Bill`**
- `id`, `title`, `chamber` (`HOUSE` | `SENATE` | `JOINT`), `status`
- `aphUrl` (unique), `aphDescription`, `aiSummary`
- `divisionsData` (JSON — party breakdown + member votes)
- `parliamentaryProgress` (JSON — stage timeline)
- `parliamentNumber`, `outcome`, `outcomeDate`
- `sponsorName`, `portfolio`, `committees`
- `hasAmendments`, `revisionsCount`

**`Vote`**
- `userId` + `billId` (unique pair — one vote per user per bill)
- `position` (`SUPPORT` | `OPPOSE` | `ABSTAIN`)
- `electorateId`, `comment`, `verificationStatus`

**`BillStage`**
- `billId`, `stage` (`INTRODUCED` | `FIRST_READING` | `SECOND_READING` | `COMMITTEE` | `THIRD_READING` | `PASSED` | `ROYAL_ASSENT`), `recordedAt`

**`MpSentiment`**
- `userId` + `mpId` (unique pair)
- `sentiment` (`POSITIVE` | `NEGATIVE`)

**Supporting models:** `Account`, `Session`, `VerificationToken` (NextAuth), `SupportTicket`, `SupportReply`, `AddressChangeLog`

---

## Local Setup

### Prerequisites
- Node.js ≥ 20
- PostgreSQL with the **PostGIS** extension enabled
- Python 3.10+ (for data ingestion scripts)

### 1. Clone & install

```bash
git clone https://github.com/Jeffa2002/crossbench.git
cd crossbench
npm install
```

### 2. Configure environment variables

Create a `.env.local` file at the project root:

```env
# Database — must have PostGIS enabled
DATABASE_URL="postgresql://user:password@localhost:5432/crossbench"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
AUTH_TRUST_HOST="true"

# Public app URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email (Resend — magic-link auth)
RESEND_API_KEY="re_xxxxxxxxxxxx"

# AI (Anthropic — bill summaries + support chat)
ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxx"

# Stripe (payments)
STRIPE_SECRET_KEY="sk_live_xxxxxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxx"
STRIPE_PRO_PRICE_ID="price_xxxxxxxxxxxx"
STRIPE_TEAM_PRICE_ID="price_xxxxxxxxxxxx"

# Google reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="6Le..."
RECAPTCHA_SECRET_KEY="6Le..."

# Admin panel (separate cookie-based auth)
ADMIN_PASSWORD="your-admin-password"

# TheyVoteForYou API (data ingestion scripts only)
TVFY_API_KEY="your-tvfy-api-key"
```

### 3. Set up the database

```bash
# Enable PostGIS on your database first
psql -d crossbench -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run Prisma migrations
npx prisma migrate deploy

# (Optional) Open Prisma Studio
npx prisma studio
```

### 4. Run the development server

```bash
npm run dev
# → http://localhost:3000
```

### 5. (Optional) Ingest data

Run data ingestion scripts to populate bills, MPs, and divisions:

```bash
# TypeScript scripts (via tsx)
npx tsx scripts/ingest-bills.ts
npx tsx scripts/scrape-historical-bills.ts
npx tsx scripts/scrape-divisions-tvfy.ts
npx tsx scripts/scrape-progress.ts

# Python scripts
python3 scripts/ingest-senators.py
python3 scripts/ingest-historical-bills.py
python3 scripts/enrich-bills.py
python3 scripts/gen-ai-summaries.py
python3 scripts/scrape-mp-profiles.py
python3 scripts/scrape-senator-photos.py
python3 scripts/scrape-bills-from-lists.py
python3 scripts/scrape-divisions-extended.py
```

---

## Project Structure

```
crossbench/
├── prisma/
│   ├── schema.prisma           # Prisma schema (all models + enums)
│   └── migrations/             # SQL migration history
├── scripts/
│   ├── ingest-bills.ts         # APH bill ingestion (TypeScript/tsx)
│   ├── scrape-historical-bills.ts
│   ├── scrape-divisions-tvfy.ts  # TheyVoteForYou division data
│   ├── scrape-divisions.ts
│   ├── scrape-progress.ts
│   ├── enrich-bills.py         # Bill enrichment (Python)
│   ├── enrich-fast.py
│   ├── gen-ai-summaries.py     # Claude AI summary generation
│   ├── ingest-senators.py
│   ├── ingest-historical-bills.py
│   ├── scrape-mp-profiles.py
│   ├── scrape-senator-photos.py
│   └── scrape-bills-from-lists.py
├── src/
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── layout.tsx          # Root layout
│   │   ├── bills/
│   │   │   ├── page.tsx        # Bills browser (paginated, filtered)
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # Bill detail + live tally
│   │   │       └── vote-button.tsx
│   │   ├── parliament/page.tsx # MP & Senator listing
│   │   ├── electorates/
│   │   │   ├── page.tsx        # Electorate directory
│   │   │   └── [id]/page.tsx   # Per-electorate sentiment
│   │   ├── mp/[id]/page.tsx    # MP profile page
│   │   ├── stats/page.tsx      # Parliamentary statistics
│   │   ├── for-mps/page.tsx    # MP product/pricing
│   │   ├── login/page.tsx      # Magic-link sign-in
│   │   ├── dashboard/page.tsx  # Citizen vote history
│   │   ├── account/verify/page.tsx  # Address verification
│   │   ├── mp-dashboard/page.tsx    # MP constituent dashboard (paid)
│   │   ├── admin/              # Admin panel
│   │   ├── about/page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts   # NextAuth handler
│   │       │   └── send-magic-link/route.ts
│   │       ├── vote/route.ts           # POST/GET votes
│   │       ├── stats/route.ts          # Statistics endpoint
│   │       ├── sentiment/route.ts      # MP sentiment
│   │       ├── me/route.ts             # Current user info
│   │       ├── support/
│   │       │   ├── route.ts            # Submit support ticket
│   │       │   └── chat/route.ts       # AI support chat (Claude Haiku)
│   │       ├── stripe/
│   │       │   ├── checkout/route.ts   # Create Stripe checkout session
│   │       │   ├── portal/route.ts     # Customer portal redirect
│   │       │   └── webhook/route.ts    # Stripe webhook handler
│   │       ├── mp/dashboard/route.ts   # MP constituent data (paid)
│   │       ├── electorate/lookup/route.ts   # Geocode → electorate lookup
│   │       ├── account/
│   │       │   ├── verify/route.ts     # Address verification
│   │       │   └── change-address/route.ts
│   │       └── admin/
│   │           ├── login/route.ts
│   │           ├── logout/route.ts
│   │           └── support/route.ts
│   ├── components/             # Shared UI components
│   └── lib/                    # Utilities, Prisma client, auth helpers
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Key Routes

| Path | Description |
|---|---|
| `/` | Landing page |
| `/bills` | Bills browser — paginated, filtered by chamber / status |
| `/bills/[id]` | Bill detail — AI summary, vote tally, divisions, progress |
| `/parliament` | All MPs & Senators with party filter |
| `/electorates` | Electorate directory |
| `/electorates/[id]` | Per-electorate constituent sentiment |
| `/mp/[id]` | MP profile — sentiment + bill comparison |
| `/stats` | Parliamentary statistics dashboard |
| `/for-mps` | MP product page & pricing |
| `/login` | Magic-link sign-in |
| `/dashboard` | Citizen — personal vote history |
| `/account/verify` | Address → electorate verification |
| `/mp-dashboard` | MP constituent dashboard (requires paid subscription) |
| `/admin` | Admin panel (separate cookie-based auth) |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/send-magic-link` | Send magic-link email |
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth session handler |
| `POST` | `/api/vote` | Cast or update a vote |
| `GET` | `/api/stats` | Parliamentary statistics |
| `POST` | `/api/sentiment` | Record MP sentiment |
| `GET` | `/api/me` | Current authenticated user |
| `POST` | `/api/support` | Submit a support ticket |
| `POST` | `/api/support/chat` | AI support chat (Claude Haiku) |
| `GET` | `/api/electorate/lookup` | Geocode address → electorate |
| `POST` | `/api/account/verify` | Verify address against electorate |
| `POST` | `/api/account/change-address` | Change registered address |
| `POST` | `/api/stripe/checkout` | Create Stripe Checkout session |
| `GET` | `/api/stripe/portal` | Redirect to Stripe Customer Portal |
| `POST` | `/api/stripe/webhook` | Handle Stripe events (subscription lifecycle) |
| `GET` | `/api/mp/dashboard` | Constituent sentiment data for MP (paid) |
| `POST` | `/api/admin/login` | Admin panel login |
| `POST` | `/api/admin/logout` | Admin panel logout |

---

## Deployment

**Production:** `203.57.50.240` · PM2 process manager · port `3006` · domain `crossbench.io`

### Setup

```bash
# 1. Install dependencies & build
npm install
npm run build

# 2. Run with PM2
pm2 start npm --name crossbench -- start -- -p 3006
pm2 save
pm2 startup

# 3. Nginx reverse proxy → localhost:3006
# Configure DNS for crossbench.io → 203.57.50.240
```

### Database

```bash
# PostgreSQL with PostGIS is required
sudo apt install postgresql postgresql-contrib postgis

# Create DB and enable extension
createdb crossbench
psql -d crossbench -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Apply migrations
npx prisma migrate deploy
```

### Stripe Webhooks

Register `https://crossbench.io/api/stripe/webhook` in the Stripe dashboard. Events handled:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (PostGIS required) |
| `NEXTAUTH_URL` | ✅ | Full canonical URL of the app |
| `NEXTAUTH_SECRET` | ✅ | Random secret for session signing |
| `AUTH_TRUST_HOST` | ✅ | Set to `true` behind a proxy/PM2 |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public-facing app URL |
| `RESEND_API_KEY` | ✅ | Resend API key for magic-link emails |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic key for Claude bill summaries + chat |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | ✅ | Stripe Price ID for Pro plan ($199/mo) |
| `STRIPE_TEAM_PRICE_ID` | ✅ | Stripe Price ID for Team plan ($499/mo) |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | ✅ | reCAPTCHA v3 public key |
| `RECAPTCHA_SECRET_KEY` | ✅ | reCAPTCHA v3 secret key |
| `ADMIN_PASSWORD` | ✅ | Admin panel cookie-auth password |
| `TVFY_API_KEY` | Scripts | TheyVoteForYou API key (data ingestion only) |

---

## Scripts Reference

| Script | Runtime | Purpose |
|---|---|---|
| `scripts/ingest-bills.ts` | `npx tsx` | Ingest current bills from APH |
| `scripts/scrape-historical-bills.ts` | `npx tsx` | Scrape historical bill records |
| `scripts/scrape-divisions-tvfy.ts` | `npx tsx` | Import division data from TheyVoteForYou |
| `scripts/scrape-divisions.ts` | `npx tsx` | Scrape division data from APH |
| `scripts/scrape-progress.ts` | `npx tsx` | Update parliamentary progress stages |
| `scripts/enrich-bills.py` | `python3` | Enrich bill records with extra metadata |
| `scripts/enrich-fast.py` | `python3` | Fast-path bill enrichment |
| `scripts/gen-ai-summaries.py` | `python3` | Generate Claude AI summaries for bills |
| `scripts/ingest-senators.py` | `python3` | Import Senator records |
| `scripts/ingest-historical-bills.py` | `python3` | Import historical bill data |
| `scripts/scrape-mp-profiles.py` | `python3` | Scrape MP profile data from APH |
| `scripts/scrape-senator-photos.py` | `python3` | Download Senator photos |
| `scripts/scrape-bills-from-lists.py` | `python3` | Scrape bills from APH listing pages |
| `scripts/scrape-divisions-extended.py` | `python3` | Extended division scraping |

---

## Contributing

1. Fork the repo and create a feature branch
2. Follow the existing TypeScript/Tailwind patterns
3. Run `npm run lint` before committing
4. Open a PR with a clear description of the change

---

## License

Private — all rights reserved. © Crossbench 2025.
