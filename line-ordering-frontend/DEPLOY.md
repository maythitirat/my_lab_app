# LINE LIFF Ordering System — Full Deployment Guide

> **Cost target:** All free tiers — Vercel Hobby, AWS Lambda free tier, Supabase free tier.

---

## Architecture Overview

```
LINE App
  └─► LIFF (Next.js on Vercel)
         └─► HTTPS POST /orders
               └─► API Gateway (HTTP API v2)
                     └─► AWS Lambda (NestJS)
                           └─► Supabase PostgreSQL (free tier)
```

---

## Prerequisites

| Tool | Install |
|------|---------|
| Node.js ≥ 20 | https://nodejs.org |
| AWS CLI v2 | `brew install awscli` → `aws configure` |
| Serverless Framework v3 | `npm i -g serverless` |
| Vercel CLI | `npm i -g vercel` |
| Git | `brew install git` |

---

## Step 1 — Supabase (Database)

1. Create a free project at **https://supabase.com/dashboard**
   - Region: **Southeast Asia (Singapore)**
   - Note down: **Project URL** and **service_role** key

2. Open **SQL Editor → New query**, paste and run:
   ```
   line-ordering-backend/supabase/migrations/001_init.sql
   ```

3. Get the **Transaction pooler** connection string:
   - Dashboard → Settings → Database → **Connection string** → URI
   - Switch the port selector to **Transaction (6543)**
   - Copy the URI — looks like:
     ```
     postgresql://postgres.XXXX:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```
   - Replace `[YOUR-PASSWORD]` with your actual DB password.

---

## Step 2 — Backend (NestJS → AWS Lambda)

### 2a. Configure environment

```bash
cd line-ordering-backend
cp .env.example .env
# Edit .env — set DATABASE_URL and ALLOWED_ORIGIN
```

**.env (production values):**
```
NODE_ENV=production
DATABASE_URL=postgresql://postgres.XXXX:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
ALLOWED_ORIGIN=https://your-frontend.vercel.app
```

### 2b. Install dependencies & build

```bash
npm install
npm run build
# → compiles TypeScript to dist/
```

### 2c. Configure AWS credentials

```bash
aws configure
# AWS Access Key ID: <your key>
# AWS Secret Access Key: <your secret>
# Default region: ap-southeast-1
# Default output format: json
```

> **Free-tier note:** Lambda gives 1 M free requests/month and 400,000 GB-s compute.
> API Gateway HTTP API gives 1 M requests/month free for the first 12 months.

### 2d. Deploy to Lambda

```bash
# Export secrets so the Serverless Framework can read them
export DATABASE_URL="postgresql://..."
export ALLOWED_ORIGIN="https://your-frontend.vercel.app"

npm run deploy:prod
# Equivalent to: npm run build && sls deploy --stage prod
```

**Expected output:**
```
✔ Service deployed to stack line-ordering-backend-prod

endpoints:
  ANY - https://abc123def.execute-api.ap-southeast-1.amazonaws.com/prod/{proxy+}
  ANY - https://abc123def.execute-api.ap-southeast-1.amazonaws.com/prod/

functions:
  api: line-ordering-backend-prod-api
```

> Copy the base URL (e.g. `https://abc123def.execute-api.ap-southeast-1.amazonaws.com/prod`).
> You will set this as `NEXT_PUBLIC_API_URL` in the next step.

### 2e. Verify backend

```bash
curl https://abc123def.execute-api.ap-southeast-1.amazonaws.com/prod/orders
# Expected: []  (empty array — no orders yet)
```

### 2f. Local development with serverless-offline

```bash
# Uses .env for DATABASE_URL
npm run sls:offline
# API available at http://localhost:3001
```

---

## Step 3 — Frontend (Next.js → Vercel)

### 3a. Create `.env.local`

```bash
cd line-ordering-frontend
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_LIFF_ID=1234567890-AbCdEfGh
NEXT_PUBLIC_API_URL=https://abc123def.execute-api.ap-southeast-1.amazonaws.com/prod
```

### 3b. Install Vercel CLI and log in

```bash
npm i -g vercel
vercel login
# Follow the browser flow to authenticate
```

### 3c. Link the project (first time only)

```bash
cd line-ordering-frontend
vercel link
# ? Set up and deploy "line-ordering-frontend"? yes
# ? Which scope? <your-account>
# ? Link to existing project? No
# ? What's your project name? line-ordering
# ? In which directory is your code located? ./
```

### 3d. Set environment variables in Vercel

```bash
# These are stored encrypted in Vercel's vault
vercel env add NEXT_PUBLIC_LIFF_ID production
# Paste: 1234567890-AbCdEfGh

vercel env add NEXT_PUBLIC_API_URL production
# Paste: https://abc123def.execute-api.ap-southeast-1.amazonaws.com/prod
```

### 3e. Deploy

```bash
vercel --prod
```

**Expected output:**
```
✅ Production deployment complete
🔗 https://line-ordering.vercel.app
```

---

## Step 4 — Configure LINE LIFF

1. Go to **LINE Developers Console** → your channel → **LIFF** tab
2. Create (or edit) a LIFF app:
   - **Endpoint URL:** `https://line-ordering.vercel.app`
   - **Scope:** `profile`
   - **Bot link feature:** Off (or On, to add the bot)
3. Copy the **LIFF ID** (format: `1234567890-AbCdEfGh`)
4. Re-run `vercel env add NEXT_PUBLIC_LIFF_ID production` with the real ID
5. Redeploy: `vercel --prod`

---

## Step 5 — Smoke Test

```bash
# 1. Place a test order via the LIFF URL
open "https://liff.line.me/<YOUR_LIFF_ID>"

# 2. Verify it landed in the DB
curl https://abc123def.execute-api.ap-southeast-1.amazonaws.com/prod/orders | jq
```

---

## Environment Variable Summary

### Frontend (`line-ordering-frontend`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_LIFF_ID` | LINE LIFF ID | `1234567890-AbCdEfGh` |
| `NEXT_PUBLIC_API_URL` | Lambda API Gateway base URL (no trailing slash) | `https://xxx.execute-api.ap-southeast-1.amazonaws.com/prod` |

### Backend (`line-ordering-backend`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase Transaction pooler URL (port 6543) |
| `ALLOWED_ORIGIN` | Vercel frontend URL for CORS |
| `NODE_ENV` | `production` on Lambda, `development` locally |
| `PORT` | Local dev port (default `3001`) |

---

## Optional — Custom Domain on Vercel

```bash
vercel domains add order.yourdomain.com
# Follow DNS instructions (add CNAME record in your DNS provider)
vercel alias set https://line-ordering.vercel.app order.yourdomain.com
```

Update `ALLOWED_ORIGIN` in Lambda and `vercel env` accordingly, then redeploy both.

---

## Cost Estimate (monthly)

| Service | Free tier | Est. usage |
|---------|-----------|------------|
| Vercel Hobby | Unlimited deploys, 100 GB bandwidth | Well within free |
| AWS Lambda | 1 M requests + 400k GB-s | Free for low traffic |
| API Gateway HTTP API | 1 M requests (12 months) | Free |
| Supabase | 500 MB DB, 2 GB bandwidth | Free |
| **Total** | **$0/month** | Small-scale production |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| LIFF shows "invalid LIFF ID" | Check `NEXT_PUBLIC_LIFF_ID` matches the LIFF tab in LINE Developers Console |
| Orders fail with CORS error | Ensure `ALLOWED_ORIGIN` on Lambda matches the exact Vercel URL (no trailing slash) |
| Lambda cold start >3s | This is normal for the first request; subsequent warm calls are fast |
| Supabase connection timeout | Ensure you are using the **Transaction pooler** URL (port **6543**), not the direct connection |
| `synchronize` error on Lambda | Migrations are skipped in production (`NODE_ENV=production`); run `001_init.sql` manually |
