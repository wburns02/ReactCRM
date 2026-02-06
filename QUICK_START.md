# Quick Start Guide

> Get the ECBTX CRM and Tennessee Septic Integration running locally.

---

## Prerequisites

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | 18+ | `node --version` |
| Python | 3.11+ | `python --version` |
| Git | Any | `git --version` |
| PostgreSQL | 14+ | `psql --version` (optional for local DB) |

---

## 1. Clone Repositories

```bash
# Frontend (React CRM)
git clone <repo-url> ReactCRM
cd ReactCRM

# Backend (FastAPI API) - in separate directory
cd ..
git clone <repo-url> react-crm-api
```

---

## 2. Frontend Setup (ReactCRM)

```bash
cd ReactCRM

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local
VITE_API_URL=http://localhost:8000/api/v2
```

### Start Frontend
```bash
npm run dev
# Runs at http://localhost:5173
```

### Build for Production
```bash
npm run build
```

---

## 3. Backend Setup (react-crm-api)

```bash
cd react-crm-api

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env
DATABASE_URL=postgresql://user:pass@localhost:5432/crm_db
SECRET_KEY=your-secret-key
JWT_SECRET=your-jwt-secret
```

### Run Database Migrations
```bash
alembic upgrade head
```

### Start Backend
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# API at http://localhost:8000
# Docs at http://localhost:8000/docs
```

---

## 4. Running Scrapers

### Tennessee TDEC Scraper (Main)
```bash
cd ReactCRM/scrapers

# Install scraper dependencies
pip install playwright aiohttp

# Install Playwright browsers
playwright install chromium

# Run scraper (long-running)
python states/tennessee/tdec_recursive_scraper.py
```

### Williamson County Scraper
```bash
cd ReactCRM/scrapers

# Run (uses Decodo proxy)
python decodo/williamson_idt_scraper.py
```

### Knox County Explorer
```bash
cd ReactCRM/scrapers

# Run (direct connection, no proxy)
python decodo/knox_county_scraper.py
```

---

## 5. Scraper Output Locations

| Scraper | Output Directory |
|---------|-----------------|
| TN TDEC | `scrapers/output/tennessee/` |
| Williamson | `scrapers/output/williamson_county/` |
| Knox | `scrapers/output/knox_county/` |

---

## 6. Remote Server Operations

### SSH to Server
```bash
ssh will@100.85.99.69
```

### Check Scraper Status
```bash
ssh will@100.85.99.69 "tail -50 ~/scrapers/logs/tn_recursive.log"
```

### Sync Data from Server
```bash
scp will@100.85.99.69:~/scrapers/output/tennessee/*.json scrapers/output/tennessee/
```

---

## 7. Running Tests

### Frontend Tests (Vitest)
```bash
cd ReactCRM
npm run test
```

### E2E Tests (Playwright)
```bash
cd ReactCRM
npx playwright test
```

### Backend Tests
```bash
cd react-crm-api
pytest
```

---

## 8. Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://react.ecbtx.com |
| API | https://react-crm-api-production.up.railway.app/api/v2 |
| API Docs | https://react-crm-api-production.up.railway.app/docs |

---

## 9. Common Commands

### Git & Deployment
```bash
# Deploy (auto-deploys on push)
git add .
git commit -m "feat: description"
git push origin master
```

### Database
```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Linting & Formatting
```bash
# Frontend
npm run lint
npm run format

# Backend
ruff check .
black .
```

---

## 10. Troubleshooting

### Frontend won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Backend DB connection fails
```bash
# Check DATABASE_URL in .env
# Ensure PostgreSQL is running
# Test connection: psql $DATABASE_URL
```

### Scraper proxy errors
```bash
# Verify Decodo credentials in scraper file
# Try different port (10001-10010)
# Some sites block datacenter IPs - use direct connection
```

### SSH to server fails
```bash
# Ensure Tailscale is connected
# Use lowercase username: will@100.85.99.69
```

---

## Next Steps

1. See `DOCUMENTATION.md` for full project details
2. See `claude-docs/` for Claude Code rules
3. See `scrapers/DECODO_PROXY_GUIDE.md` for proxy setup
