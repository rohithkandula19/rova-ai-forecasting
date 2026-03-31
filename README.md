# ROVA AI Forecasting Platform

> Statistical intelligence platform — Dense NN + LSTM + Monte Carlo — GCP + PostgreSQL 16

---

## ⚡ Run Everything in 3 Commands

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/rova-ai-forecasting
cd rova-ai-forecasting

# 2. Start full stack (PostgreSQL, Redis, API, Worker, Frontend, MLflow, Prometheus, Grafana)
docker compose up -d

# 3. Run database migrations
docker compose exec api alembic upgrade head
```

**That's it. Open:**

| Service     | URL                        | Credentials         |
|-------------|----------------------------|---------------------|
| Frontend    | http://localhost:3000       | —                   |
| API Docs    | http://localhost:8000/api/docs | —               |
| MLflow      | http://localhost:5001       | —                   |
| Grafana     | http://localhost:3001       | admin / rova_grafana |
| Flower      | http://localhost:5555       | —                   |
| Prometheus  | http://localhost:9090       | —                   |

---

## 🖥️ VS Code Setup

```bash
# Install recommended extensions (shown in popup on first open)
# Or install manually:
code --install-extension ms-python.python
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-azuretools.vscode-docker

# Open workspace
code .

# Debug backend: F5 → "FastAPI — Debug Backend"
# Backend auto-reloads on file save (volume mounted)
```

---

## 📱 Mobile + Desktop

The frontend is fully responsive:

| Breakpoint | Layout |
|---|---|
| < 768px (mobile) | Bottom tab bar · Slide-over sidebar · Stacked cards |
| 768–1024px (tablet) | Persistent sidebar · Top nav · 2-col grids |
| > 1024px (desktop) | Full 3–4 col grids · All panels visible |

Test on mobile: Vite dev server binds to `0.0.0.0:3000` — open `http://YOUR_LAN_IP:3000` on your phone.

---

## 🗄️ Database — PostgreSQL 16 Only

**Zero SQLite. Zero.** Every model uses PostgreSQL-native types:

```python
numbers = Column(ARRAY(Integer))   # lottery numbers stored as arrays
results = Column(JSONB)            # simulation results as JSONB
id      = Column(UUID(as_uuid=True))  # UUID primary keys everywhere
```

### Useful DB commands

```bash
# Connect to PostgreSQL
docker compose exec db psql -U rova_user -d rova_db

# Run migrations
docker compose exec api alembic upgrade head

# Create new migration
docker compose exec api alembic revision --autogenerate -m "add_column_x"

# Reset database (destructive)
docker compose down -v && docker compose up -d db
docker compose exec api alembic upgrade head
```

---

## ☁️ GCP Deployment

### 1. Enable GCP services

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  servicenetworking.googleapis.com
```

### 2. Store secrets

```bash
echo -n "postgresql+asyncpg://user:pass@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE" | \
  gcloud secrets create rova-database-url --data-file=-

echo -n "your-256bit-secret-key" | \
  gcloud secrets create rova-secret-key --data-file=-
```

### 3. Deploy with Terraform

```bash
cd infrastructure/terraform
terraform init
terraform apply \
  -var="project_id=YOUR_PROJECT_ID" \
  -var="db_password=SECURE_PASSWORD"
```

### 4. Push to main → auto deploys

```bash
git push origin main
# GitHub Actions: test → build → push GCR → migrate → deploy Cloud Run → Slack notify
```

---

## 🏗️ Architecture

```
Mobile / Desktop Browser
        │
        ▼ HTTPS
GCP Cloud Load Balancer + Managed SSL
        │
  ┌─────┴──────┐
  ▼            ▼
Cloud Run    Cloud Run
(Frontend)   (FastAPI API)
  nginx         │         │
  gzip      Cloud SQL   Memorystore
  SPA       PostgreSQL   Redis 7
            16 (HA)      │
                         ▼
                    Cloud Run
                  (Celery Worker)
                    Monte Carlo
                    Backtesting
                    Drift detect
                         │
                         ▼
                   GCS Bucket
                  (model .pt files)
```

---

## 📁 Full Project Structure

```
rova-ai-forecasting/
│
├── docker-compose.yml          ← Start everything: docker compose up -d
├── .env.example                ← Copy to .env, values pre-filled for Docker
├── .gitignore
├── README.md
│
├── .vscode/
│   ├── settings.json           ← Python path, formatter, Tailwind
│   ├── launch.json             ← F5 debug FastAPI + Celery
│   └── extensions.json         ← Recommended extensions
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt        ← All Python deps (asyncpg, PyTorch, Celery…)
│   ├── alembic.ini
│   ├── .env                    ← Pre-filled for local Docker dev
│   │
│   ├── alembic/
│   │   ├── env.py              ← Async PostgreSQL migrations
│   │   ├── script.py.mako
│   │   └── versions/           ← Migration files go here
│   │
│   ├── scripts/
│   │   └── init.sql            ← Extensions + seed games (runs on first start)
│   │
│   └── app/
│       ├── main.py             ← FastAPI app, CORS, Prometheus, Sentry
│       ├── core/
│       │   ├── config.py       ← Pydantic settings (reads .env)
│       │   └── security.py     ← JWT, bcrypt
│       ├── db/
│       │   └── database.py     ← Async SQLAlchemy engine (PostgreSQL only)
│       ├── models/
│       │   └── models.py       ← All 7 SQLAlchemy models (UUID, ARRAY, JSONB)
│       ├── api/v1/
│       │   ├── auth.py         ← Register, login, JWT
│       │   ├── games.py        ← List/get games
│       │   ├── draws.py        ← CRUD draws (PostgreSQL ARRAY)
│       │   ├── features.py     ← Statistical features, heatmap
│       │   ├── score.py        ← Combo scorer, top-k
│       │   ├── simulate.py     ← Monte Carlo (async background task)
│       │   ├── backtest.py     ← Strategy backtesting
│       │   ├── models_router.py← ML model registry
│       │   └── ws.py           ← WebSocket live draw feed
│       ├── services/
│       │   └── ml_service.py   ← Dense NN + LSTM + SHAP explanations
│       └── workers/
│           ├── celery_app.py   ← Celery config, beat schedule
│           └── tasks.py        ← Monte Carlo, backtest, drift detect, retrain
│
├── frontend/
│   ├── Dockerfile              ← Production: multi-stage nginx build
│   ├── Dockerfile.dev          ← Dev: hot reload with volume mount
│   ├── nginx.conf              ← Gzip, SPA routing, security headers
│   ├── package.json
│   ├── vite.config.ts          ← Proxy to API, code splitting
│   ├── tailwind.config.js      ← ROVA design tokens + mobile breakpoints
│   ├── tsconfig.json
│   ├── index.html              ← JetBrains Mono + Space Grotesk fonts
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx             ← React Router with all 5 screens
│       ├── index.css           ← Scanline effect, scrollbar, animations
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   └── Layout.tsx  ← Desktop sidebar + Mobile bottom tabs
│       │   └── ui/
│       │       └── index.tsx   ← Card, MetricCard, Ball, BarRow, Spinner, Tag, TerminalLog
│       │
│       ├── screens/
│       │   ├── Analytics.tsx   ← Heatmap, freq bars, last draws, log
│       │   ├── Predict.tsx     ← Live scorer, gauge, SHAP attribution, top-5
│       │   ├── Simulate.tsx    ← Monte Carlo, controls, DNA fingerprint
│       │   ├── Backtest.tsx    ← 4-strategy comparison, narrative
│       │   └── Models.tsx      ← Registry, loss curve, feat importance, drift log
│       │
│       ├── stores/
│       │   ├── gameStore.ts    ← Zustand: selected game (persisted)
│       │   └── authStore.ts    ← Zustand: JWT token (persisted)
│       │
│       └── api/
│           └── client.ts       ← Axios + React Query wrappers for all endpoints
│
├── infrastructure/
│   └── terraform/
│       ├── main.tf             ← Cloud SQL PG16, Cloud Run, Redis, GCS, VPC, SSL
│       ├── variables.tf
│       └── outputs.tf
│
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml      ← Scrape API, Redis, Flower
│   └── grafana/
│       └── dashboards/         ← Add dashboard JSON files here
│
└── .github/
    └── workflows/
        └── deploy.yml          ← test → build GCR → migrate → Cloud Run → Slack
```

---

## 🔑 GitHub Actions Secrets Required

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_SA_KEY` | Service account JSON (base64) |
| `VITE_API_URL` | `https://rova-api-xxxx-uc.a.run.app` |
| `VITE_WS_URL` | `wss://rova-api-xxxx-uc.a.run.app` |
| `SLACK_WEBHOOK` | Slack incoming webhook URL |

---

## 🛠️ Common Commands

```bash
# View logs
docker compose logs -f api
docker compose logs -f worker
docker compose logs -f frontend

# Restart a single service
docker compose restart api

# Run a Celery task manually
docker compose exec worker celery -A app.workers.celery_app call app.workers.tasks.drift_detection_task

# Check PostgreSQL tables
docker compose exec db psql -U rova_user -d rova_db -c "\dt"

# Install new Python dep
docker compose exec api pip install some-package
# Then add to requirements.txt and rebuild: docker compose build api

# Wipe and restart clean
docker compose down -v
docker compose up -d
docker compose exec api alembic upgrade head
```

---

Built by **RO** · ROVA AI Forecasting v1.0.0
