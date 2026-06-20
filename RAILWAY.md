# Truvornex — Complete Railway Deployment Guide

This guide takes you from zero to a production-grade deployment of Truvornex on Railway, including PostgreSQL, environment variables, health checks, and custom domains.

---

## 1. Pre-flight checklist

Before you deploy, confirm these are true locally:

- [ ] `npm run dev` starts without errors
- [ ] All 10+ required env vars are set (list in section 4)
- [ ] The app responds at `http://localhost:5000/api/health` → `{"status":"ok",...}`
- [ ] `package.json` has a `"build"` script and a `"start"` script

Check your `package.json` — it must have:

```json
{
  "scripts": {
    "dev":   "node server/index.js",
    "build": "vite build",
    "start": "node server/index.js"
  }
}
```

---

## 2. Push your code to GitHub

Railway deploys from a Git repository.

```bash
# If you haven't already
git init
git add .
git commit -m "Initial commit"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/truvornex.git
git push -u origin main
```

---

## 3. Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Click **Deploy from GitHub repo**
3. Authorize Railway to access your GitHub account
4. Select your `truvornex` repository
5. Railway auto-detects Node.js and creates the service — **do not click Deploy yet**

---

## 4. Add PostgreSQL database

1. In your Railway project canvas, click **+ New** → **Database** → **Add PostgreSQL**
2. Railway creates a managed Postgres instance and links it to your project
3. Click on the Postgres service → **Variables** tab → copy the `DATABASE_URL` value
   - It looks like: `postgresql://postgres:PASSWORD@HOST:PORT/railway`

---

## 5. Set environment variables

Click your main **Truvornex service** → **Variables** → **Add All**:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | (auto-linked from Postgres) | Click "Add Reference" to link it directly |
| `NODE_ENV` | `production` | Critical — enables security headers, disables dev logs |
| `SESSION_SECRET` | (generate 64-char random string) | `openssl rand -hex 32` |
| `TRUST_PASSPORT_SECRET` | (generate 64-char random string) | `openssl rand -hex 32` |
| `MFA_ENCRYPTION_KEY` | (generate 32-char hex) | `openssl rand -hex 16` |
| `SIMON_SYSTEM_TOKEN` | (generate random string) | Used for Simon AI internal auth |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Get from [openrouter.ai](https://openrouter.ai) — enables Simon AI |
| `SMTP_HOST` | `smtp.gmail.com` | Or your SMTP provider |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | `your@email.com` | |
| `SMTP_PASS` | (app password) | Use Gmail App Password, not your main password |
| `SMTP_FROM` | `noreply@truvornex.com` | |
| `PORT` | (leave empty) | Railway sets this automatically |

**To link `DATABASE_URL` directly:**
- In Variables → click **Add Reference** → select your Postgres service → `DATABASE_URL`
- This way if Railway rotates credentials, your app gets them automatically

---

## 6. Configure build & start commands

Click your Truvornex service → **Settings** tab:

| Setting | Value |
|---|---|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Root Directory** | `/` (leave empty) |

Railway runs `Build Command` once, then `Start Command` to keep the process alive.

---

## 7. Configure health check

Still in **Settings**:

| Setting | Value |
|---|---|
| **Health Check Path** | `/api/health` |
| **Health Check Timeout** | `30` seconds |

Railway will wait for `/api/health` to return `200` before marking the deploy as successful and shifting traffic.

---

## 8. Deploy

1. Click **Deploy** (or push a new commit — Railway auto-deploys on every push to `main`)
2. Click **View Logs** in real-time to watch the build
3. Wait for: `✓ Security tables initialized` + `Truvornex dev server running on port 5000`
4. Railway assigns a public URL like `https://truvornex-production.up.railway.app`

---

## 9. Custom domain (optional)

1. Truvornex service → **Settings** → **Networking** → **Custom Domain**
2. Enter your domain: `app.truvornex.com`
3. Railway gives you a `CNAME` target — add it in your DNS provider:
   ```
   Type:  CNAME
   Name:  app
   Value: truvornex-production.up.railway.app
   TTL:   300
   ```
4. Railway auto-provisions an SSL certificate (Let's Encrypt). Takes ~2 minutes.

---

## 10. PostGIS extension (required for location features)

Your app uses PostGIS for spatial zone detection. Enable it on Railway Postgres:

1. Railway Postgres service → **Query** tab (or connect with a GUI like TablePlus)
2. Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```
3. Railway Postgres has PostGIS pre-installed — you just need to enable it.

---

## 11. Database migrations on first deploy

The app self-migrates on startup via `initNewTables()`. You don't need to run anything manually. On first boot:

1. All tables are created (`bookings`, `services`, `reviews`, etc.)
2. All indexes are built
3. All PostgreSQL LISTEN/NOTIFY triggers are installed
4. Simon AI monitor starts 7 scheduled jobs

If you ever need to run a one-off migration:

1. Railway Postgres → **Query** tab
2. Paste your SQL and run

---

## 12. Scaling and performance settings

In Railway service **Settings**:

| Setting | Recommended | Why |
|---|---|---|
| **Replicas** | 1 (start here) | SSE connections are stateful; use 1 replica unless behind a Redis adapter |
| **Memory** | 512 MB minimum | Simon AI + pg-pool + Vite build cache |
| **CPU** | 0.5 vCPU minimum | Node is single-threaded; 0.5 is plenty for <500 concurrent users |
| **Auto-sleep** | OFF | SSE connections and scheduled jobs require always-on |

> ⚠️ **Important:** If you scale to multiple replicas, SSE broadcast will only reach clients on the same replica. To fix this, add Redis pub/sub (`ioredis`) and replace the in-memory `clients` Map with Redis pub/sub. Single replica works for most traffic levels.

---

## 13. Environment-specific config differences

| Feature | Development | Production |
|---|---|---|
| Security headers (CSP, COEP) | Disabled | Enabled |
| HTTPS | No | Yes (Railway handles TLS) |
| Session `secure` cookie | No | Yes |
| Vite HMR | Yes | No (served from `dist/`) |
| Error stack traces in API | Yes | No (generic `500` response) |
| Simon AI LLM calls | Fail gracefully if no key | Real calls with `OPENROUTER_API_KEY` |

---

## 14. Monitoring & logs

**Railway native:**
- Service → **Logs** tab: streaming logs with search/filter
- Service → **Metrics**: CPU, memory, request count graphs

**What to watch for in logs:**
```
✓ All required environment variables are set and validated    ← startup OK
✓ Realtime DB triggers installed                             ← real-time OK
✓ Realtime PG listeners active                              ← SSE push OK
Truvornex dev server running on port 5000                   ← serving traffic
[Simon Monitor] All scheduled jobs started                  ← Simon AI OK

[500] error: ...                                            ← investigate
Failed to write Simon memory: ...                           ← check DB
[Simon AI] ... failed with status 401                       ← check OPENROUTER_API_KEY
```

---

## 15. Rollback

If a deploy breaks things:

1. Railway service → **Deployments** tab
2. Click any previous deployment → **Rollback**
3. Traffic switches back in ~10 seconds

---

## 16. CI/CD (automatic deploys)

Railway auto-deploys on every push to `main`. To protect production:

1. Create a `staging` branch → connect it to a separate Railway service
2. Merge to `main` only after staging looks good
3. Or use Railway **Environments** (Pro plan) for `staging` and `production` in the same project

---

## Quick-reference checklist

```
□ GitHub repo pushed
□ Railway project created
□ PostgreSQL service added
□ DATABASE_URL linked by reference
□ All env vars set (SESSION_SECRET, TRUST_PASSPORT_SECRET, MFA_ENCRYPTION_KEY, etc.)
□ Build command: npm install && npm run build
□ Start command: npm start
□ Health check: /api/health
□ PostGIS extension enabled in DB
□ Auto-sleep disabled
□ Custom domain CNAME added (optional)
□ First deploy shows "Truvornex dev server running on port 5000" in logs
```

---

*Generated for Truvornex · June 2026*
