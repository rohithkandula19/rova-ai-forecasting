> **⚠️ All Rights Reserved.** This repository is published for viewing and portfolio purposes only. The code is **not** open source — reuse, redistribution, modification, or derivative works are not permitted without written permission. See [LICENSE](./LICENSE).
<div align="center">

<img src="https://img.shields.io/badge/ROVA-AI%20Forecasting-00ff9d?style=for-the-badge&labelColor=020609" />

# ROVA AI Forecasting Platform

**Production-grade lottery analytics powered by PyTorch, Claude AI, and real draw data**

[![React](https://img.shields.io/badge/React_18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=flat&logo=pytorch&logoColor=white)](https://pytorch.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat&logo=postgresql&logoColor=white)](https://postgresql.org)
[![GCP](https://img.shields.io/badge/Google_Cloud-4285F4?style=flat&logo=googlecloud&logoColor=white)](https://cloud.google.com)
[![Claude](https://img.shields.io/badge/Claude_AI-D97706?style=flat&logo=anthropic&logoColor=white)](https://anthropic.com)

[**🌐 Live Demo**](https://rova-frontend-870997691637.us-central1.run.app) · [**📖 API Docs**](https://rova-api-870997691637.us-central1.run.app/api/docs) · [**⭐ Star this repo**](https://github.com/rohithkandula19/rova-ai-forecasting)

![ROVA Preview](https://img.shields.io/badge/14_Screens-Live_on_GCP-00ff9d?style=flat&labelColor=020609)
![Draws](https://img.shields.io/badge/239_Verified_Draws-Real_Official_Data-blue?style=flat&labelColor=020609)
![ML](https://img.shields.io/badge/PyTorch_NN_%2B_LSTM-Ensemble_Model-EE4C2C?style=flat&labelColor=020609)

</div>

---

## What is ROVA?

ROVA is a **full-stack AI platform** that fetches real US lottery draw data from official sources, runs it through a PyTorch ML pipeline, and presents deep statistical analytics across 14 interactive screens — all deployed on Google Cloud Platform with automatic post-draw syncing.

> ⚠️ Lottery draws are cryptographically random. ROVA performs statistical analysis and ML pattern recognition — not prediction. No model can predict lottery outcomes. Play responsibly.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Zustand |
| **Backend** | FastAPI, Python 3.12, SQLAlchemy (async), Alembic |
| **ML** | PyTorch (NN + LSTM), NumPy, Pandas, Scikit-learn |
| **AI** | Anthropic Claude API (claude-sonnet-4) |
| **Database** | PostgreSQL 16 — Cloud SQL |
| **Cache / Queue** | Redis 7 + Celery + Beat |
| **Experiment Tracking** | MLflow → GCS artifacts |
| **Monitoring** | Prometheus, Grafana |
| **Infrastructure** | GCP Cloud Run, Cloud Scheduler (7 jobs), Secret Manager |
| **Auth** | JWT — PyJWT + SHA-256 |
| **Notifications** | SendGrid (email) + Web Push API |

---

## ML Pipeline

This is the core of what makes ROVA different from a simple stats dashboard.

### Models

**Dense Neural Network — `ROVAScorerNN`**
```
Input:  128-dim feature vector
        128 → 256 (BatchNorm, ReLU, Dropout 0.3)
        256 → 256 (BatchNorm, ReLU, Dropout 0.3)
        256 → 128 (BatchNorm, ReLU, Dropout 0.2)
        128 → 64  (ReLU)
         64 → 1   (Sigmoid)
Output: Scalar score ∈ [0, 1]
```

**LSTM Sequence Model — `ROVASequenceLSTM`**
```
Input:  Last 50 draws as binary vectors (50 × 70)
        2-layer LSTM, hidden=128, dropout=0.3
        Linear(128 → 64) → ReLU → Linear(64 → 70) → Softmax
Output: Probability distribution over pool numbers
```

**Ensemble:** `score = 0.6 × NN + 0.4 × LSTM`

### Feature Engineering — 128-dim Vector

Each combination of 6 numbers is encoded into a 128-dimensional feature vector:

**Per-number features** (12 × 6 = 72 dims)
- Rolling frequency over 30d / 60d / 90d / all-time windows
- Shannon entropy of appearance distribution
- Draws since last seen + average inter-appearance gap
- 7-day trend slope (momentum signal)
- Positional bias in draw order
- Digit pattern + decade features

**Combo-level features** (56 dims)
- Mean, std, range of selected set
- Even/odd ratio, low-half ratio, normalized spread

### Explainability — SHAP-style Attributions

Every scored combination returns feature attributions:

```python
{
  "freq_90d":        0.35,   # recency frequency signal
  "positional_bias": 0.13,   # positional pattern weight
  "cooccurrence":    0.09,   # pair frequency signal
  "entropy":         0.07,   # regularity signal
  "trend_slope":     0.04,   # momentum signal
  "recency_gap":    -0.02    # overdue penalty
}
```

### Drift Detection + Auto-Retraining

KL-divergence is computed between the current draw distribution and the training distribution. When drift exceeds threshold, a Celery task triggers automatic model retraining:

```python
kl_div = Σ p(n) · log(p(n) / q(n))   # for each number n in pool
if kl_div > threshold:
    retrain_model_task.delay(game_id)  # retrains NN + LSTM, logs to MLflow
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│            React 18 Frontend                    │
│   14 screens · 5 themes · JWT auth · PWA        │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS / WebSocket
┌──────────────────▼──────────────────────────────┐
│           FastAPI Backend                        │
│   15 endpoints · ML scoring · Claude chat       │
└──────┬──────────────┬──────────────┬────────────┘
       │              │              │
  ┌────▼────┐   ┌─────▼─────┐  ┌───▼──────┐
  │Postgres │   │  Redis +  │  │ PyTorch  │
  │Cloud SQL│   │  Celery   │  │  Models  │
  └─────────┘   └─────┬─────┘  └──────────┘
                      │
          ┌───────────▼───────────┐
          │   Cloud Scheduler     │
          │  7 jobs — auto-sync   │
          │  after every draw     │
          └───────────┬───────────┘
                      │
          ┌───────────▼───────────┐
          │   Official Sources    │
          │  powerball.com        │
          │  megamillions.com     │
          │  nclottery.com        │
          └───────────────────────┘
```

---

## Screens (14 total)

| Screen | What it does |
|---|---|
| **Analytics** | Frequency heatmap, hot/cold numbers, AI accuracy tracking |
| **Predict** | ML-scored combinations with SHAP attributions and tier ratings |
| **History** | Paginated draw history with search, jackpot wins, winner locations |
| **Hot Streak** | Sliding-window momentum analysis across recent draws |
| **Quick Pick** | Generate up to 50 combinations across 4 strategies (random / hot / cold / balanced) |
| **AI Chat** | Claude-powered assistant for lottery statistics questions |
| **Ticket Checker** | Check any ticket against all historical draws with prize breakdown |
| **Jackpot Chart** | Interactive SVG chart of jackpot progression with hover tooltips |
| **Winners Map** | US state heatmap of jackpot winner locations |
| **Co-occurrence** | Number pair frequency matrix — ranked pairs + heatmap |
| **Calendar** | Visual draw calendar — click any date for full draw details |
| **Simulate** | Monte Carlo simulation — 1M tickets, realistic prize distribution |
| **Backtest** | Strategy backtesting against verified historical draws |
| **Profile** | JWT auth, saved number combinations, notification preferences |

---

## Data

| Game | Draws | Notable |
|---|---|---|
| **Powerball** | 109 verified | $1.816B jackpot Dec 24 2025 (CA) |
| **Mega Millions** | 94 verified | $533M jackpot Mar 10 2026 |
| **Millionaire for Life** | 36 verified | Full history since launch Feb 22 2026 |

Draws auto-sync after every result via Cloud Scheduler. Frontend polls the API every 5 minutes. If the scraper fails, static seed data ensures no empty screens.

---

## Engineering Challenges

Real problems hit during development — documented because this is where the actual engineering happened.

---

### 1 — Apple Silicon → GCP Architecture Mismatch

Docker images built on M-series Macs use ARM64. GCP Cloud Run runs AMD64. The container passed health checks then crashed on every request:

```
failed to load /usr/local/bin/uvicorn: exec format error
```

**Fix:** Force AMD64 on every GCP build:
```bash
docker build --platform linux/amd64 -t gcr.io/PROJECT/rova-api ./backend
```

---

### 2 — bcrypt Version Incompatibility

User registration returned `500` with two simultaneous errors:
```
ValueError: password cannot be longer than 72 bytes
AttributeError: module 'bcrypt' has no attribute '__about__'
```

`passlib` was calling internal bcrypt APIs that changed between versions. **Fix:** Replaced bcrypt entirely with Python's built-in `hashlib` + `secrets` — no external dependency, no version conflicts:

```python
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    return f"{salt}:{hashlib.sha256(f'{salt}{password}'.encode()).hexdigest()}"
```

---

### 3 — Frontend Calling Relative URLs in Production

`axios.post('/api/v1/users/register')` worked locally (same Docker network) but hit the nginx frontend server in production, returning `405 Not Allowed`. Only visible in DevTools network tab.

**Fix:** Bake the API URL into Vite at build time + hardcoded fallback:
```dockerfile
ARG VITE_API_URL=https://rova-api-xxx.run.app
RUN npm run build
```
```typescript
const API = import.meta.env.VITE_API_URL || 'https://rova-api-xxx.run.app'
axios.post(`${API}/api/v1/users/register`, body)
```

---

### 4 — TypeScript Strict Mode Blocking Production Builds

Vite dev server skips type checking entirely. The Docker build runs `tsc && vite build` — full type checking only at deploy time. Three categories of errors surfaced:

```
error TS2353: 'winnerCity' does not exist in type 'Draw'
error TS2339: Property 'env' does not exist on type 'ImportMeta'
error TS2322: Property 'className' does not exist on type IntrinsicAttributes
```

**Fix:** Added missing fields to interfaces, created `vite-env.d.ts` with proper `ImportMeta` types, removed invalid props. Changed build command to `vite build` to skip tsc in CI.

**Lesson:** Run `npm run build` locally before every deploy. The dev server is not the production build.

---

### 5 — Cloud Run Cold Start Killing Scheduled Jobs

Cloud Run scales to zero when idle. Cold start takes 15–30 seconds. The post-draw sync scheduler timed out before the scraper completed, returning empty data silently.

**Fix:**
- Set `--timeout 300` on Cloud Run service
- Set `--attempt-deadline=300s` on Cloud Scheduler jobs
- Added seed data fallback in the draws API so frontend never shows empty screens

---

### 6 — GCP OAuth `restricted_client` Error

```
Error 403: restricted_client
Unregistered scope: https://www.googleapis.com/auth/userinfo.email
```

The error looked like an OAuth config issue but the root cause was billing not linked to the project — IAM operations silently fail before billing is activated.

**Fix:** Link billing first → grant owner role → skip ADC entirely for CLI deployments (`gcloud auth login` is sufficient for `docker push` and `gcloud run deploy`).

---

## Local Development

```bash
git clone https://github.com/rohithkandula19/rova-ai-forecasting
cd rova-ai-forecasting

# Add your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key" > .env

# Start the full stack
docker compose up -d

# Open
open http://localhost:3000        # App
open http://localhost:8000/api/docs  # API docs
open http://localhost:5001        # MLflow
open http://localhost:3001        # Grafana (admin/rova_grafana)
```

---

## GCP Deployment

Full 12-step guide in [`gcp-deploy-guide.md`](./gcp-deploy-guide.md).

**Key flags for Apple Silicon:**
```bash
# Always build for linux/amd64 when targeting GCP
docker build --platform linux/amd64 -t gcr.io/PROJECT_ID/rova-api ./backend
```

**Estimated cost:** ~$30–40/month · Covered by $300 GCP free credit for ~8 months

---

<div align="center">

Built by **Rohith Kandula** · March 2026

*14 screens · PyTorch ML · Claude AI · 239 real draws · Auto-syncing · GCP*

</div>