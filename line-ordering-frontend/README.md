# line-ordering-frontend

Next.js 14 (App Router) LIFF mini-app for the LINE Ordering System.

## Tech Stack
- **Next.js 14** App Router
- **TypeScript**
- **TailwindCSS**
- **LINE LIFF SDK** (`@line/liff`)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_LIFF_ID=<your LIFF ID from LINE Developers Console>
#   NEXT_PUBLIC_API_URL=http://localhost:3001

# 3. Start in dev mode
npm run dev
```

App runs at **http://localhost:3000**

> **No LINE account?** Leave `NEXT_PUBLIC_LIFF_ID` empty and a mock profile (`Dev User`) is used automatically so you can develop offline.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Product grid with category filter |
| `/cart` | Cart review, quantity controls, total |
| `/checkout` | Delivery form, LINE profile auto-fill, order submission, success screen |

## Setting Up LINE LIFF

1. [LINE Developers Console](https://developers.line.biz/console/) → create Provider + Messaging API channel
2. **LIFF** tab → Add LIFF app
   - Size: **Full**
   - Endpoint URL: your deployed URL (e.g. `https://your-domain.vercel.app`)
   - Scopes: `profile`
3. Copy the **LIFF ID** → `NEXT_PUBLIC_LIFF_ID` in `.env.local`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_LIFF_ID` | LINE LIFF App ID |
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g. `http://localhost:3001`) |

## Production Build

```bash
npm run build
npm start
```

## Deploy to Vercel

```bash
npx vercel --prod
# Set NEXT_PUBLIC_LIFF_ID and NEXT_PUBLIC_API_URL in Vercel project settings
```
