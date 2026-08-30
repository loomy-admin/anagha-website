# Deploy Anagha on GCP (manual console)

No Terraform. Create each product in the Google Cloud console, then build and push the two Docker images from this repo.

**Region:** `asia-south1` (Mumbai) — same as the existing Octis ERP Cloud Run service.

**Suggested names**

| Resource | Name |
| --- | --- |
| Cloud SQL instance | `anagha-pg` |
| Database | `anagha` |
| GCS bucket | `anagha-website-assets` (must be globally unique; add a suffix if taken) |
| Artifact Registry repo | `anagha` |
| Cloud Run (API) | `anagha-backend` |
| Cloud Run (site) | `anagha-frontend` |

Replace `YOUR_PROJECT_ID` everywhere below.

---

## Live production snapshot

Project: **`anagha-jewellers`** · Region: **`asia-south1`**

| Resource | Value |
| --- | --- |
| Cloud SQL connection name | `anagha-jewellers:asia-south1:anagha-pg` |
| Database | `anagha` |
| GCS bucket | `gs://anagha-website-assets` (public `allUsers` objectViewer) |
| Backend Cloud Run | `anagha-backend` → `https://anagha-backend-jc4alta5gq-el.a.run.app` (also `…-646499775904.asia-south1.run.app`) |
| Frontend Cloud Run | `anagha-frontend` → `https://anagha-frontend-646499775904.asia-south1.run.app` |
| Public site | `https://anaghajewellers.com` / `https://www.anaghajewellers.com` |
| Public API | `https://api.anaghajewellers.com` |
| DNS / TLS edge | Cloudflare (proxied CNAMEs + **Worker** host rewrite — see §13) |
| Data | Neon dump restored into Cloud SQL (`cached_catalog_items` ~1600 rows) |

**Verified smoke (public):**

- `GET https://api.anaghajewellers.com/health` → `{"ok":true,"service":"anagha-backend"}`
- `GET https://api.anaghajewellers.com/api/catalog?limit=1` → catalog JSON from Cloud SQL
- `GET https://anaghajewellers.com` / `www` → Next.js **200**
- Nameservers → `clara.ns.cloudflare.com` / `jonah.ns.cloudflare.com`

**Known follow-up:** `GET https://anaghajewellers.com/api/...` can **500** until the frontend image is **rebuilt** with `BACKEND_URL=https://api.anaghajewellers.com` (Next rewrites bake that URL at build time; runtime env alone is not enough). Direct `api.` host works.

---

## 1. Prerequisites

On your laptop:

- [Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/install) + `gsutil`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy) (for dump/restore from Windows)
- `pg_dump` / `pg_restore` (install [PostgreSQL client tools](https://www.postgresql.org/download/windows/))

Login:

```powershell
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

---

## 2. Enable APIs

Console: **APIs & Services → Enable APIs** (or run):

```powershell
gcloud services enable `
  run.googleapis.com `
  sqladmin.googleapis.com `
  artifactregistry.googleapis.com `
  storage.googleapis.com `
  secretmanager.googleapis.com `
  iam.googleapis.com
```

---

## 3. Cloud SQL for PostgreSQL

Console: **SQL → Create instance**

| Setting | Value |
| --- | --- |
| Database engine | PostgreSQL **16** (or **18** — both fine with this app) |
| Instance ID | `anagha-pg` |
| Password | generate a strong password and save it |
| Region | `asia-south1` |
| Zonal availability | Single zone is enough to start |
| Machine | Enterprise, 1 vCPU / 3.75 GB (`db-custom-1-3840`) or the smallest shared core if you are testing |
| Storage | SSD, 10 GB, enable automatic increase |
| Connections | **Public IP** on (needed for the first dump from your laptop). Private IP optional later |
| Authorized networks | your home/office IP while restoring, or use the Auth Proxy (preferred) |

After the instance is ready:

1. **Databases → Create database** named `anagha`.
2. **Users** — keep the default postgres user, or create `anagha_app` with a password.
3. Copy **Connection name**: `YOUR_PROJECT_ID:asia-south1:anagha-pg`.

### Cloud Run connection string (Unix socket)

```
postgresql://USER:PASSWORD@/anagha?host=/cloudsql/YOUR_PROJECT_ID:asia-south1:anagha-pg
```

URL-encode special characters in the password (`@`, `#`, `/`, etc.).

### Laptop connection string (Auth Proxy on 127.0.0.1:5432)

```
postgresql://USER:PASSWORD@127.0.0.1:5432/anagha
```

Start the proxy in another terminal:

```powershell
cloud-sql-proxy YOUR_PROJECT_ID:asia-south1:anagha-pg
```

---

## 4. Cloud Storage (images)

Console: **Cloud Storage → Create bucket**

| Setting | Value |
| --- | --- |
| Name | `anagha-website-assets` (or unique variant) |
| Location | Region `asia-south1` |
| Storage class | Standard |
| Access control | **Uniform** |
| Public access | You will allow public object reads (storefront images) |

Public read (console: bucket **Permissions**, or):

```powershell
gcloud storage buckets add-iam-policy-binding gs://anagha-website-assets `
  --member=allUsers `
  --role=roles/storage.objectViewer
```

If you get **412** / `do not belong to a permitted customer`, the org policy **Domain restricted sharing** (`iam.allowedPolicyMemberDomains`) is blocking `allUsers`. On the project, set that constraint to **Google-managed default** (or allow public principals), wait a minute, then retry the IAM binding.

Optional CORS (only if the browser loads objects directly and you see CORS errors):

```powershell
@"
[{"origin":["https://anaghajewellers.com","https://www.anaghajewellers.com","http://localhost:3000"],"method":["GET","HEAD"],"responseHeader":["Content-Type"],"maxAgeSeconds":3600}]
"@ | Set-Content -Encoding utf8 cors.json
gsutil cors set cors.json gs://anagha-website-assets
```

Do **not** put service-account JSON keys in Cloud Run env. The Cloud Run runtime account writes to the bucket (next section).

---

## 5. Artifact Registry

Console: **Artifact Registry → Create repository**

| Setting | Value |
| --- | --- |
| Name | `anagha` |
| Format | Docker |
| Mode | Standard |
| Location | `asia-south1` |

Image URLs will be:

```
asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/anagha/backend:latest
asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/anagha/frontend:latest
```

---

## 6. IAM (Cloud Run runtime account)

Console: **IAM & Admin → IAM**

Find the default Compute Engine / Cloud Run runtime SA:

`YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com`

Grant:

| Role | Why |
| --- | --- |
| **Cloud SQL Client** | Unix socket to Cloud SQL |
| **Storage Object Admin** | Upload CMS + catalog images to the bucket |

```powershell
gcloud projects add-iam-policy-binding anagha-jewellers `
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" `
  --role="roles/cloudsql.client"
```

No JSON key download. On Cloud Run leave `GCS_CLIENT_EMAIL` and `GCS_PRIVATE_KEY` unset.

Optional: **Secret Manager Secret Accessor** if you store DB/Razorpay/SMTP secrets there.

---

## 7. Copy existing files into the bucket

From the repo root (after you have local `backend/uploads`):

```powershell
gsutil -m rsync -r backend/uploads gs://anagha-website-assets
```

Existing CMS rows that store a bare filename (`hero.jpg`) still resolve to `/uploads/hero.jpg` via the frontend helper. After you set `GCS_BUCKET`, **new** uploads store a full `https://storage.googleapis.com/...` URL.

Catalog photos that still point at foreign ERP/Supabase URLs can be copied later with:

```powershell
cd backend
$env:DATABASE_URL = "postgresql://USER:PASSWORD@127.0.0.1:5432/anagha"
$env:GCS_BUCKET = "anagha-website-assets"
$env:GCS_MAKE_PUBLIC = "true"
npx tsx src/scripts/relocateCatalogImages.ts
```

---

## 8. Move data Neon → Cloud SQL

With Cloud SQL Auth Proxy running (and `pg_dump` / `pg_restore` on `PATH` — on Windows often `D:\Postgressql\bin` or `C:\Program Files\PostgreSQL\16\bin`):

```powershell
# Dump Neon (use your current Neon URL; prefer non-pooler host if dump fails)
pg_dump --no-owner --no-acl -Fc -f anagha.dump "postgresql://neondb_owner:PASSWORD@HOST/neondb?sslmode=require"

# Prefer an EMPTY database. If you already ran db:migrate, drop/recreate `anagha` first
# so pg_restore does not hit "already exists" / duplicate-key noise.

# Restore into Cloud SQL (proxy on 5432)
pg_restore --no-owner --no-acl -d "postgresql://USER:PASSWORD@127.0.0.1:5432/anagha" anagha.dump
```

Then apply any newer schema statements:

```powershell
cd backend
$env:DATABASE_URL = "postgresql://USER:PASSWORD@127.0.0.1:5432/anagha"
npm run db:migrate
```

Skip `db:seed` if you restored real data.

Quick row check:

```powershell
psql "postgresql://USER:PASSWORD@127.0.0.1:5432/anagha" -c "SELECT count(*) FROM cached_catalog_items;"
```

---

## 9. Build and push images

From the **repo root**. Build backend first (no frontend URL required).

```powershell
docker build -t asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/anagha/backend:latest .\backend
docker push asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/anagha/backend:latest
```

Deploy backend (next section), copy its `*.run.app` URL, then build frontend **with that URL**:

```powershell
docker build `
  --build-arg BACKEND_URL=https://anagha-backend-xxxxx.asia-south1.run.app `
  --build-arg NEXT_PUBLIC_BASE_URL=https://anagha-frontend-xxxxx.asia-south1.run.app `
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID `
  -t asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/anagha/frontend:latest `
  .\frontend

docker push asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/anagha/frontend:latest
```

`BACKEND_URL` is compiled into Next.js rewrites. If the backend URL changes, rebuild and redeploy the frontend.

If you do not know the frontend URL yet, omit `NEXT_PUBLIC_BASE_URL` for the first build, deploy, then rebuild with the real frontend URL.

---

## 10. Cloud Run — backend

Console: **Cloud Run → Create service** (or deploy from the image you pushed).

| Setting | Value |
| --- | --- |
| Service name | `anagha-backend` |
| Region | `asia-south1` |
| Deploy from | Artifact Registry image `.../anagha/backend:latest` |
| Port | **8080** |
| CPU / memory | 1 vCPU, 512 MiB (raise to 1 GiB if ERP import OOMs) |
| Min instances | 0 (or 1 if you want no cold start) |
| Max instances | 5 to start |
| Request timeout | 300s (ERP import can be slow) |
| CPU allocation | CPU is only allocated during request processing |
| Ingress | All (or Load Balancer later) |
| Authentication | **Allow unauthenticated** (public storefront API via the Next proxy) |
| Cloud SQL connections | Add `YOUR_PROJECT_ID:asia-south1:anagha-pg` |
| Service account | default compute SA (with the IAM roles above) |

Health check path: `/health` (startup probe).

### Backend environment variables

| Variable | Example / notes |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Cloud Run sets this; do not override unless needed |
| `DATABASE_URL` | Unix socket URL from section 3 |
| `SESSION_SECRET` | ≥16 random chars |
| `COOKIE_SECURE` | `true` |
| `CORS_ORIGIN` | `https://anaghajewellers.com\,https://www.anaghajewellers.com` (escape `,` as `\,` for `gcloud --update-env-vars`) |
| `PUBLIC_BASE_URL` | **frontend** public URL (`https://anaghajewellers.com`) |
| `PUBLIC_API_BASE_URL` | **backend** public URL (`https://api.anaghajewellers.com`) |
| `GCS_BUCKET` | `anagha-website-assets` |
| `GCS_PUBLIC_BASE_URL` | `https://storage.googleapis.com/anagha-website-assets` |
| `GCS_PROJECT_ID` | `YOUR_PROJECT_ID` |
| `GCS_MAKE_PUBLIC` | `true` |
| `ERP_API_URL` | existing ERP Cloud Run `/api` |
| `ERP_STORE_SLUG` | as today |
| `ERP_BRANCH_ID` | as today |
| `RAZORPAY_KEY_ID` | |
| `RAZORPAY_KEY_SECRET` | |
| `RAZORPAY_DISPLAY_NAME` | |
| `SMTP_*` / `MAIL_FROM` | optional |
| `GOOGLE_CLIENT_ID` | optional, must match frontend |

Do **not** set `GCS_CLIENT_EMAIL` or `GCS_PRIVATE_KEY` on Cloud Run.

gcloud equivalent (after the first console create, updates are easier from CLI):

```powershell
gcloud run deploy anagha-backend `
  --region asia-south1 `
  --image asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/anagha/backend:latest `
  --port 8080 `
  --allow-unauthenticated `
  --add-cloudsql-instances YOUR_PROJECT_ID:asia-south1:anagha-pg `
  --set-env-vars "NODE_ENV=production,COOKIE_SECURE=true,GCS_BUCKET=anagha-website-assets,GCS_MAKE_PUBLIC=true"
```

Prefer `--set-secrets` / console **Secrets** for `DATABASE_URL`, `SESSION_SECRET`, `RAZORPAY_KEY_SECRET`, `SMTP_PASS`.

Smoke (PowerShell: use `curl.exe`, not the `curl` alias):

```powershell
curl.exe -s https://api.anaghajewellers.com/health
curl.exe -s "https://api.anaghajewellers.com/api/catalog?limit=2"
```

Expect `{"ok":true,"service":"anagha-backend"}` and catalog JSON.

Update backend env after custom domains (note `\,` in `CORS_ORIGIN`):

```powershell
gcloud run services update anagha-backend `
  --region=asia-south1 `
  --add-cloudsql-instances=anagha-jewellers:asia-south1:anagha-pg `
  --update-env-vars="COOKIE_SECURE=true,CORS_ORIGIN=https://anaghajewellers.com\,https://www.anaghajewellers.com,PUBLIC_BASE_URL=https://anaghajewellers.com,PUBLIC_API_BASE_URL=https://api.anaghajewellers.com,GCS_BUCKET=anagha-website-assets,GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/anagha-website-assets,GCS_PROJECT_ID=anagha-jewellers,GCS_MAKE_PUBLIC=true"
```

---

## 11. Cloud Run — frontend

| Setting | Value |
| --- | --- |
| Service name | `anagha-frontend` |
| Region | `asia-south1` |
| Image | `.../anagha/frontend:latest` |
| Port | **8080** |
| CPU / memory | 1 vCPU, 512 MiB–1 GiB |
| Authentication | **Allow unauthenticated** |

### Frontend env (runtime)

| Variable | Why |
| --- | --- |
| `BACKEND_URL` | SSR `fetch` + must match Docker **build-arg** for Next rewrites |
| `NEXT_PUBLIC_BASE_URL` | public site origin (`https://anaghajewellers.com`) |

```powershell
gcloud run services update anagha-frontend `
  --region=asia-south1 `
  --update-env-vars="BACKEND_URL=https://api.anaghajewellers.com,NEXT_PUBLIC_BASE_URL=https://anaghajewellers.com"
```

Rebuild when `BACKEND_URL` changes (rewrites are compile-time):

```powershell
docker build `
  --build-arg BACKEND_URL=https://api.anaghajewellers.com `
  --build-arg NEXT_PUBLIC_BASE_URL=https://anaghajewellers.com `
  -t asia-south1-docker.pkg.dev/anagha-jewellers/cloud-run-source-deploy/anagha-website/anagha-frontend:latest `
  .\frontend
```

Open the site. The browser uses `anaghajewellers.com`; Next can proxy `/api/*` and `/uploads/*` to the backend once rewrites point at `https://api.anaghajewellers.com`.

---

## 12. Smoke tests

```powershell
curl.exe -s https://api.anaghajewellers.com/health
curl.exe -s "https://api.anaghajewellers.com/api/catalog?limit=2"
curl.exe -sI https://anaghajewellers.com
curl.exe -sI https://www.anaghajewellers.com
curl.exe -sI "https://anaghajewellers.com/api/catalog?limit=1"   # needs rebuilt frontend
```

Manual:

1. Homepage loads (hero, categories, offers)
2. Sign up / login (cookie on `anaghajewellers.com`)
3. Admin `/upload` — upload image; object appears in GCS and storefront shows it
4. Catalog listing + product page
5. Checkout (Razorpay test card) if keys are set
6. Re-import ERP from admin (long request; 300s timeout)

---

## 13. Custom domain via Cloudflare (current approach)

Cloud Run **domain mapping** is optional. This project uses **Cloudflare Free** as the public edge:

| Host | DNS | Proxy |
| --- | --- | --- |
| `anaghajewellers.com` | CNAME → `anagha-frontend-….run.app` | Proxied |
| `www` | CNAME → same frontend | Proxied |
| `api` | CNAME → `anagha-backend-….run.app` | Proxied |

CNAME **target = hostname only** (no `https://`).

Registrar nameservers must be Cloudflare (`clara` / `jonah.ns.cloudflare.com`), not Hostinger parking.

### Why a Worker is required (Free plan)

A proxied CNAME alone sends `Host: anaghajewellers.com` to Cloud Run → Google **404**. Origin Rule **Host header rewrite** is not available on Free. Use a **Worker** that `fetch`es the `*.run.app` origin (correct Host) while the browser URL stays on your domain.

Worker routes (minimum):

```text
anaghajewellers.com/*
www.anaghajewellers.com/*
api.anaghajewellers.com/*
```

(`*.anaghajewellers.com/*` alone does **not** cover the apex.)

Sketch (site + API in one Worker):

```js
const FRONTEND = "anagha-frontend-646499775904.asia-south1.run.app";
const BACKEND = "anagha-backend-jc4alta5gq-el.a.run.app";

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const originHost =
      incoming.hostname === "api.anaghajewellers.com" ? BACKEND : FRONTEND;
    const url = new URL(request.url);
    url.hostname = originHost;
    const init = { method: request.method, headers: request.headers, redirect: "manual" };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
      init.duplex = "half";
    }
    return fetch(url.toString(), init);
  },
};
```

Cloudflare **SSL/TLS**: Full or Full strict. Do **not** use a Redirect Rule to `*.run.app` if you want the site served on your domain.

After DNS + Worker:

1. Set backend `CORS_ORIGIN`, `PUBLIC_BASE_URL`, `PUBLIC_API_BASE_URL` (see §10)
2. Rebuild frontend with `BACKEND_URL=https://api.anaghajewellers.com`
3. Update Google OAuth authorized origins / redirect URIs
4. Update Razorpay allowed URLs if required

Alternatives: Cloud Run domain mapping + `ghs.googlehosted.com`, or GCP HTTPS Load Balancer.

---

## 14. Cut over from Vercel + Render

1. Confirm GCP site works end-to-end (including `/api` after frontend rebuild)
2. Keep Cloudflare DNS on Cloud Run (already done for `anaghajewellers.com`)
3. Disable or delete the Render backend (`render.yaml` is unused after cutover)
4. Remove the Vercel project
5. Keep Neon read-only for a few days, then delete

---

## 15. What does **not** move to GCP

| Service | Reason |
| --- | --- |
| Razorpay | Payments |
| Gmail SMTP | Transactional mail still works from Cloud Run |
| Google Sign-In | Already Google; set Client IDs for the new origins |
| Octis ERP | Already on Cloud Run; `ERP_API_URL` unchanged |
| India Post pincode API | Public HTTP API from the browser |

---

## Local development (unchanged)

```powershell
cp backend\.env.example backend\.env
cp frontend\.env.example frontend\.env.local
# set DATABASE_URL (Neon or Cloud SQL proxy) and leave GCS_BUCKET unset
npm run install:all
npm run backend:migrate
npm run dev:backend
npm run dev:frontend
```

Without `GCS_BUCKET`, uploads still write to `backend/uploads` and are served at `/uploads/...`.

---

## Useful file map

| Path | Role |
| --- | --- |
| [frontend/Dockerfile](../frontend/Dockerfile) | Next.js standalone image |
| [backend/Dockerfile](../backend/Dockerfile) | Express image |
| [backend/src/db/index.ts](../backend/src/db/index.ts) | `pg` pool (Cloud SQL + Neon TCP both work) |
| [backend/src/lib/objectStorage.ts](../backend/src/lib/objectStorage.ts) | GCS + local `/uploads` |
