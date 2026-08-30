# Anagha Website

Monorepo with a Next.js frontend and Express + Postgres backend.

```
anagha-website/
├── frontend/     # Next.js app (UI + admin upload pages)
├── backend/      # Express API + Postgres (Cloud SQL in production)
├── docs/         # GCP_DEPLOY.md — manual Cloud Run / Cloud SQL / GCS setup
└── package.json  # workspace scripts
```


Production hosting is **GCP only** (Cloud Run + Cloud SQL + Cloud Storage). Follow [docs/GCP_DEPLOY.md](docs/GCP_DEPLOY.md).

**Deploy note:** Next.js `BACKEND_URL` is baked at **image build** (not Cloud Run runtime). CI uses GitHub Actions with repository variables (`BACKEND_URL`, `NEXT_PUBLIC_BASE_URL`) — see [docs/GCP_DEPLOY.md §16](docs/GCP_DEPLOY.md) and [`.github/workflows/deploy-gcp.yml`](.github/workflows/deploy-gcp.yml). Runtime secrets (`DATABASE_URL`, Razorpay, etc.) stay on Cloud Run only.

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

Or separately:

```bash
npm install --prefix frontend
npm install --prefix backend
```

### 2. Environment

```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Backend
cp backend/.env.example backend/.env
# then set DATABASE_URL (Postgres: local, Neon TCP, or Cloud SQL Auth Proxy)
# Production GCP: see docs/GCP_DEPLOY.md
# and ERP catalog + checkout wiring:
#   ERP_API_URL=http://localhost:4000/api
#   ERP_STORE_SLUG=<org-slug-from-octis>
#   ERP_BRANCH_ID=<branch-uuid>
#   WEBSTORE_SECRET=<same as ERP WEBSTORE_SECRET>
#   ERP_PUBLIC_SITE_URL=https://anagha.octis.in
#   RAZORPAY_KEY_ID=rzp_test_...
#   RAZORPAY_KEY_SECRET=...
#   RAZORPAY_DISPLAY_NAME=Octis
#   PUBLIC_BASE_URL=http://localhost:3000
#   PUBLIC_API_BASE_URL=http://localhost:4001
```

Jewellery catalog pages load **live available inventory** from Octis ERP via the Anagha BFF (`/api/catalog`). Checkout uses **Buy now** → reserve → redirect to `/checkout/pay` → **Razorpay Standard Checkout** (single payment UI) → `/checkout/thanks` → ERP sale bill (official ERP PDF via BFF `/api/site/invoice/{id}`). Marketing CMS (hero/offers) uses Postgres. On Cloud Run, uploaded images go to Cloud Storage.

**Razorpay sandbox:** use [test cards](https://razorpay.com/docs/payments/payments/test-card-upi-details/) (e.g. `4111 1111 1111 1111`). Live keys (`rzp_live_…`) come later after account activation.

### 3. Database

```bash
npm run backend:migrate
npm run backend:seed
```

### 4. Run locally

```bash
# terminal 0 — Octis ERP API (http://localhost:4000)
# from Gold-Shop-Management-System/backend

# terminal 1 — Anagha BFF (http://localhost:4001)
npm run dev:backend

# terminal 2 — website (http://localhost:3000)
npm run dev:frontend
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev:frontend` | Start Next.js |
| `npm run dev:backend` | Start Express API |
| `npm run backend:migrate` | Apply DB schema |
| `npm run backend:seed` | Seed from existing metadata |
| `npm run build` | Build frontend |
