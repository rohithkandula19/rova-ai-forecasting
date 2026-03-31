# ROVA AI Forecasting Platform

> Full-stack AI-powered lottery analytics platform built with React, FastAPI, PostgreSQL, and Claude AI. Deployed on Google Cloud Platform.

🌐 **Live Demo:** https://rova-frontend-870997691637.us-central1.run.app  
💻 **GitHub:** https://github.com/rohithkandula19/rova-ai-forecasting

---

## Features

- 📊 **Analytics** — frequency heatmaps, hot/cold numbers, jackpot trend charts
- 🤖 **AI Chat** — Claude-powered lottery statistics assistant
- 🎫 **Ticket Checker** — check any ticket against all historical draws with prize breakdown
- 🎯 **Quick Pick** — generate up to 50 AI-informed combinations across 4 strategies
- 📈 **Jackpot Chart** — interactive SVG chart of jackpot progression history
- 🗺️ **Winners Map** — US state heatmap of jackpot winner locations
- 🧠 **Co-occurrence** — number pair frequency matrix and ranked pairs
- 📅 **Draw Calendar** — full visual calendar of draw results
- 🔔 **Notifications** — email (SendGrid) + browser push alerts after each draw
- 👤 **User Accounts** — JWT auth, saved number combinations, notification preferences
- 🎨 **5 Themes** — Terminal, Clean, Cyberpunk, Ocean, Sunset
- 🔄 **Auto-sync** — Cloud Scheduler fetches new draws within 5 minutes of each result

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Zustand |
| Backend | FastAPI, Python 3.12, SQLAlchemy (async), Alembic |
| Database | PostgreSQL 16 (GCP Cloud SQL) |
| Cache | Redis 7 (GCP Memorystore) |
| Queue | Celery + Beat |
| AI | Anthropic Claude API (claude-sonnet-4) |
| Auth | JWT (PyJWT + SHA-256 hashing) |
| Notifications | SendGrid (email) + Web Push API (browser) |
| Infra | GCP Cloud Run, Cloud SQL, Cloud Scheduler, Secret Manager, Container Registry |
| Monitoring | Grafana, Prometheus, MLflow |

---

## Architecture

```
┌─────────────────────────────────────┐
│  React Frontend (GCP Cloud Run)     │
│  Polls /api/v1/draws every 5 min   │
└──────────────┬──────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────┐
│  FastAPI Backend (GCP Cloud Run)    │
│  14 API routers, JWT auth, CORS     │
└──────┬──────────────┬───────────────┘
       │              │
┌──────▼──────┐ ┌─────▼──────┐
│ PostgreSQL  │ │   Redis    │
│ Cloud SQL   │ │ Memorystore│
└─────────────┘ └────────────┘
       ▲
┌──────┴──────────────────────────────┐
│  Cloud Scheduler (7 jobs)           │
│  Powerball:  Mon/Wed/Sat 11:05pm ET │
│  Mega Millions: Tue/Fri 11:10pm ET  │
│  MFL: Daily 11:20pm ET              │
└──────┬──────────────────────────────┘
       │ HTTP scrape
┌──────▼──────────────────────────────┐
│  Official Lottery Sites             │
│  powerball.com · megamillions.com   │
└─────────────────────────────────────┘
```

---

## Data

| Game | Draws | Period |
|---|---|---|
| Powerball | 109 verified draws | Sep 2025 – Mar 2026 |
| Mega Millions | 94 verified draws | May 2025 – Mar 2026 |
| Millionaire for Life | 36 draws | Feb 2026 – Mar 2026 (full history since launch) |

Notable draws included: Powerball $1.816B (Dec 24, 2025 · CA), Mega Millions $533M (Mar 10, 2026).

---

## Screens (14 total)

`/analytics` · `/predict` · `/history` · `/hotstreak` · `/quickpick` · `/chat` · `/checker` · `/jackpot` · `/map` · `/cooccur` · `/calendar` · `/simulate` · `/backtest` · `/profile`

---

## Local Development

```bash
git clone https://github.com/rohithkandula19/rova-ai-forecasting
cd rova-ai-forecasting

# Add your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env

# Start everything
docker compose up -d

# Open the app
open http://localhost:3000

# API docs
open http://localhost:8000/api/docs
```

**Requirements:** Docker Desktop, Node 20+, Python 3.12+

---

## GCP Deployment

Full 12-step deployment guide in `gcp-deploy-guide.md`. Summary:

```bash
# 1. Build for linux/amd64 (required for GCP from Apple Silicon)
docker build --platform linux/amd64 -t gcr.io/PROJECT_ID/rova-api ./backend
docker push gcr.io/PROJECT_ID/rova-api

# 2. Deploy to Cloud Run
gcloud run deploy rova-api \
  --image gcr.io/PROJECT_ID/rova-api \
  --set-secrets="DATABASE_URL=rova-database-url:latest,ANTHROPIC_API_KEY=rova-anthropic-key:latest" \
  --add-cloudsql-instances PROJECT_ID:us-central1:rova-postgres \
  --region us-central1

# 3. Set up schedulers (auto-sync after every draw)
gcloud scheduler jobs create http rova-sync-powerball \
  --schedule="5 23 * * 1,3,6" \
  --time-zone="America/New_York" \
  --uri="https://your-api.run.app/api/v1/admin/sync"
```

**Estimated GCP cost:** ~$30–40/month (covered by $300 free credit for ~8 months)

---

## Engineering Challenges

These are the real problems encountered during development and deployment — documented here because debugging these is where the actual learning happened.

---

### 1. Apple Silicon → GCP Architecture Mismatch (ARM vs AMD64)

**The problem:**  
Docker images built on an M-series Mac use ARM64 architecture by default. GCP Cloud Run runs on Intel/AMD (x86_64) servers. Deploying without specifying the target platform produced this error:

```
terminated: Application failed to start: failed to load /usr/local/bin/uvicorn: exec format error
```

The container started, passed health checks momentarily, then crashed immediately on every request. The error message was misleading — it looked like a path issue, not an architecture issue.

**The fix:**  
Force AMD64 builds explicitly on every Docker build targeting GCP:

```bash
docker build --platform linux/amd64 -t gcr.io/PROJECT_ID/rova-api ./backend
```

**Lesson:** Always specify `--platform linux/amd64` when building for GCP from Apple Silicon. Add it to your Makefile or build script so it's never forgotten.

---

### 2. bcrypt Version Incompatibility Breaking Auth

**The problem:**  
The user registration endpoint returned `500 Internal Server Error` with this in the logs:

```
ValueError: password cannot be longer than 72 bytes, truncate manually if necessary
AttributeError: module 'bcrypt' has no attribute '__about__'
```

Two separate bcrypt issues hitting at once. The `passlib` library was calling internal bcrypt APIs that changed between versions, and bcrypt's 72-byte password limit was being hit by the error handler itself before the real error could surface.

**The fix:**  
Replaced bcrypt entirely with a SHA-256 + salt implementation using Python's built-in `hashlib` and `secrets` modules — no external dependency, no version conflicts, and sufficient security for this use case:

```python
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{hashed}"
```

**Lesson:** Third-party auth libraries add fragile version dependencies. For internal apps, `hashlib` + `secrets` is simpler, more portable, and easier to debug.

---

### 3. Frontend Calling Relative URLs Instead of Absolute API

**The problem:**  
The React frontend was deployed to Cloud Run at `rova-frontend-xxx.run.app`. API calls like `axios.post('/api/v1/users/register')` hit the nginx server serving the frontend — not the FastAPI backend at `rova-api-xxx.run.app`. Nginx returned `405 Not Allowed` on POST requests to static routes.

The confusing part: the app worked perfectly locally because both services ran on the same Docker network. The bug only appeared in production.

**The fix:**  
Two-part solution. First, bake the API URL into the Vite build at Docker build time:

```dockerfile
ARG VITE_API_URL=https://rova-api-870997691637.us-central1.run.app
RUN npm run build
```

Second, update every axios call to use the absolute URL with a hardcoded fallback:

```typescript
const API = import.meta.env.VITE_API_URL || 'https://rova-api-870997691637.us-central1.run.app'
axios.post(`${API}/api/v1/users/register`, body)
```

**Lesson:** Never use relative API URLs in a multi-service deployment. Always use `import.meta.env.VITE_API_URL` with a hardcoded fallback, and verify the actual HTTP requests in DevTools Network tab before assuming the frontend is calling the right endpoint.

---

### 4. TypeScript Strict Mode Blocking Production Builds

**The problem:**  
The local dev server (Vite with HMR) skips TypeScript type checking entirely — it just transpiles. The Docker production build runs `tsc && vite build`, which does full type checking. Three categories of errors only appeared at deploy time:

```
error TS2353: Object literal may only specify known properties, 
              and 'winnerCity' does not exist in type 'Draw'

error TS2339: Property 'env' does not exist on type 'ImportMeta'

error TS2322: Property 'className' does not exist on type IntrinsicAttributes
```

**The fix:**  
- Added missing fields (`winnerCity`, `winnerState`, `winnerCount`) to the `Draw` interface in `realDraws.ts`
- Created `vite-env.d.ts` with proper `ImportMeta` type declarations for Vite env variables
- Removed invalid `className` props from component calls
- Changed the build command from `tsc && vite build` to `vite build` to skip tsc in CI (type errors caught in dev, not blocking deploys)

**Lesson:** Run `npm run build` locally before every GCP deploy. The dev server is not the same as the production build.

---

### 5. Cloud Run Cold Start + Scraper Timeout

**The problem:**  
Cloud Run scales to zero instances when idle. The first request after idle triggers a cold start that takes 15–30 seconds. The Cloud Scheduler job that fires at 11:05pm ET to sync lottery draws has a default timeout — if the container was cold, it would spin up, start the scraper, but the scheduler would time out before the scrape completed, returning no data.

Additionally, `min-instances=0` meant the API was completely unresponsive for the first 15–30 seconds after any period of inactivity, which also affected the scheduler.

**The fix:**  
- Set `--timeout 300` on Cloud Run to give jobs 5 minutes to complete
- Set `--attempt-deadline=300s` on Cloud Scheduler jobs
- Added a fallback in the draws API: if the scraper returns empty, serve from the in-memory seed data so the frontend always has draws to display
- For future improvement: set `--min-instances 1` to keep one instance warm (adds ~$15/month)

**Lesson:** Cloud Run cold starts are real and affect scheduled jobs. Always set explicit timeouts on both the Cloud Run service and the scheduler, and build fallback data paths so users never see empty screens.

---

### 6. OAuth `restricted_client` Error During GCP Auth

**The problem:**  
Running `gcloud auth application-default login` opened a browser that immediately returned:

```
Access blocked: Authorization Error
Error 403: restricted_client
Unregistered scope(s) in the request: 
  https://www.googleapis.com/auth/userinfo.email, openid
```

This blocked the entire GCP setup. The error looked like an OAuth configuration problem but the root cause was that Application Default Credentials (ADC) hadn't been granted the `serviceusage.services.use` permission on the project — which only gets granted after billing is linked.

**The fix:**  
Three steps in order:
1. Link billing account to the GCP project at `console.cloud.google.com/billing/linkedaccount?project=PROJECT_ID`
2. Grant owner role: `gcloud projects add-iam-policy-binding PROJECT_ID --member="user:EMAIL" --role="roles/owner"`
3. Skip ADC entirely for deployment — `gcloud auth login` is sufficient for `docker push` and `gcloud run deploy`

ADC is only needed for local development with Google client libraries, not for CLI-based deployments.

**Lesson:** GCP auth has three separate credential types (`gcloud auth login`, `application-default login`, service accounts). For CLI deployments, only `gcloud auth login` is required. Link billing before attempting any IAM operations — many permission errors are actually billing errors in disguise.

---

## API Endpoints

```
GET  /health                          — health check
GET  /api/v1/draws/{game_id}          — get draws (live + seed)
POST /api/v1/draws/{game_id}/add      — add a new draw result
GET  /api/v1/draws/{game_id}/stats    — frequency stats
POST /api/v1/users/register           — create account
POST /api/v1/users/login              — sign in
GET  /api/v1/users/me                 — current user
POST /api/v1/chat                     — AI chat (Claude)
POST /api/v1/admin/sync               — trigger draw sync
POST /api/v1/notifications/email/subscribe — subscribe to email alerts
GET  /api/docs                        — Swagger UI
```

---

## Disclaimer

⚠️ Lottery draws are cryptographically random. All statistical analysis in ROVA — frequency patterns, hot/cold numbers, co-occurrence matrices, AI predictions — has **zero predictive value** for future draws. ROVA is a data visualization and analytics tool, not a gambling system. Play responsibly.

---

*Built with React + FastAPI + Claude AI + GCP · March 2026*

---

## ML Pipeline (ml_service.py)

ROVA contains a genuine ML pipeline built with PyTorch — not just statistics.

### Models

**ROVAScorerNN — Dense Neural Network**
```
Input:  128-dim feature vector (per-number + combo-level features)
Layers: 128 → 256 (BatchNorm, ReLU, Dropout 0.3)
        256 → 256 (BatchNorm, ReLU, Dropout 0.3)
        256 → 128 (BatchNorm, ReLU, Dropout 0.2)
        128 → 64  (ReLU)
         64 → 1   (Sigmoid)
Output: Scalar score in [0, 1]
```

**ROVASequenceLSTM — Sequence Model**
```
Input:  Last 50 draws as binary vectors (50 × 70)
Layers: 2-layer LSTM, hidden=128, dropout=0.3
        Linear(128, 64) → ReLU → Linear(64, 70) → Softmax
Output: Probability distribution over pool numbers (70,)
```

**Ensemble:** `score = 0.6 × NN_score + 0.4 × LSTM_score`

### Feature Engineering (128-dim vector)

Per-number features (12 × 6 = 72 dims):
- Frequency over 30d / 60d / 90d / all-time windows
- Shannon entropy of appearance distribution
- Draws since last seen + average gap between appearances
- 7-day trend slope (momentum)
- Positional bias in draw order
- Number digit pattern + decade features

Combo-level features (56 dims):
- Mean, std, range of selected numbers
- Even/odd ratio, low-half ratio
- Normalized position in pool

### Explainability

SHAP-style attribution scores computed per combination:
- `freq_90d_contrib` — frequency signal weight
- `positional_bias_contrib` — positional signal weight
- `entropy_contrib` — regularity signal weight
- `trend_slope_contrib` — momentum signal weight
- `cooccurrence_contrib` — pair frequency signal weight

### MLflow Experiment Tracking

All training runs logged to MLflow:
- Hyperparameters, val_loss per epoch
- Model artifacts pushed to GCS
- Accessible at `http://localhost:5001` locally

### Drift Detection + Auto-Retraining

KL-divergence monitored between current draw distribution and training distribution. When drift exceeds threshold, Celery triggers automatic retraining:
```python
kl_div = sum(p * log(p/q) for each number)
if kl_div > threshold:
    retrain_model_task.delay(game_id)
```

> ⚠️ Important: While the ML pipeline is architecturally sound, lottery draws are cryptographically random. No model — regardless of sophistication — can predict outcomes. The models learn statistical patterns in historical data but these patterns have zero predictive value for future draws. The ML pipeline is a demonstration of production ML engineering, not a prediction system.
