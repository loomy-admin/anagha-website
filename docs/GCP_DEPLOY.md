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
| Database engine | PostgreSQL **16** |
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
gsutil iam ch allUsers:objectViewer gs://anagha-website-assets
```

Optional CORS (only if the browser loads objects directly and you see CORS errors):

```powershell
@"
[{"origin":["https://YOUR-FRONTEND.run.app","http://localhost:3000"],"method":["GET","HEAD"],"responseHeader":["Content-Type"],"maxAgeSeconds":3600}]
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

With Cloud SQL Auth Proxy running:

```powershell
# Dump Neon (use your current Neon URL)
pg_dump --no-owner --no-acl -Fc -f anagha.dump "postgresql://neondb_owner:PASSWORD@HOST/neondb?sslmode=require"

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
| `CORS_ORIGIN` | frontend `https://anagha-frontend-xxxxx.asia-south1.run.app` (comma-separated if you add a custom domain) |
| `PUBLIC_BASE_URL` | **frontend** public URL |
| `PUBLIC_API_BASE_URL` | **backend** public URL (`https://anagha-backend-xxxxx.asia-south1.run.app`) |
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

Smoke:

```powershell
curl https://anagha-backend-xxxxx.asia-south1.run.app/health
```

Expect `{"ok":true,"service":"anagha-backend"}`.

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
| `BACKEND_URL` | SSR `fetch` to the API (same value as the Docker **build-arg**) |
| `NEXT_PUBLIC_BASE_URL` | already baked at build; runtime copy is harmless |

```powershell
gcloud run deploy anagha-frontend `
  --region asia-south1 `
  --image asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/anagha/frontend:latest `
  --port 8080 `
  --allow-unauthenticated `
  --set-env-vars "BACKEND_URL=https://anagha-backend-xxxxx.asia-south1.run.app"
```

Open the frontend URL. The browser talks only to the frontend origin; Next proxies `/api/*` and `/uploads/*` to the backend.

---

## 12. Smoke tests

1. `GET` backend `/health`
2. Homepage loads (hero, categories, offers)
3. Sign up / login (cookie on the frontend host)
4. Admin `/upload` — upload a hero or offer image; confirm the object appears in the GCS bucket and the storefront shows it
5. Catalog listing + product page
6. Checkout (Razorpay test card) if keys are set
7. Re-import ERP from admin (long request; 300s timeout)

---

## 13. Custom domain (optional)

Cloud Run → service → **Custom domains** (or a HTTPS load balancer + Cloud DNS).

After DNS is live:

1. Add the domain to backend `CORS_ORIGIN` and `PUBLIC_BASE_URL`
2. Rebuild frontend with `BACKEND_URL` still pointing at the backend (custom API host or `*.run.app`)
3. Update Google OAuth authorized origins / redirect URIs
4. Update Razorpay allowed URLs if required

---

## 14. Cut over from Vercel + Render

1. Confirm GCP site works end-to-end
2. Point the public domain at Cloud Run
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
