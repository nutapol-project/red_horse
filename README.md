# 🐴 Red Horse Project
### Predictive Anti-Fraud & Network Surveillance System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python)](https://python.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat&logo=tailwindcss)](https://tailwindcss.com)

---

## 🔗 Live Demo

> **Frontend Dashboard:** [https://red-horse-dashboard.vercel.app](https://red-horse-dashboard.vercel.app)
>
> **API Documentation (Swagger UI):** `http://localhost:8000/docs` *(run locally)*

---

## 📋 Overview

Red Horse is a real-time **Mule Account Detection** system that identifies fraudulent bank accounts at the moment of registration — before any transaction occurs. It combines:

- **Behavioral Biometrics** — Keystroke variance analysis (σ²)
- **Bayesian Inference** — Sequential probability updating from first-mile behavioral triggers
- **Benford's Law** — Natural number distribution deviation detection
- **Graph Neural Networks (GNN)** — Fraud ring community detection via heterogeneous graph topology

The system produces a dynamic **Fraud Probability Score** (0.00–1.00) and automatically enforces risk-based policy actions.

```
Data Ingestion → Engine A (Statistical) ┐
                                        ├→ Score Fusion → Policy Engine → Action
                Engine B (GNN Graph)   ┘
```

---

## 🏗️ Project Structure

```
red_horse/
├── backend/                    # FastAPI Python Backend
│   ├── main.py                 # API Gateway & Endpoints
│   ├── schemas.py              # Pydantic Request/Response Models
│   ├── policy.py               # Policy Engine & Threshold Enforcement
│   ├── simulator.py            # Pandas Batch Simulation
│   ├── engines/
│   │   ├── __init__.py
│   │   ├── engine_a.py         # Statistical Anomaly & Bayesian Inference
│   │   └── engine_b.py         # GNN Graph Topology & Isolation Forest
│   └── requirements.txt
│
└── frontend/                   # React + Vite Dashboard
    ├── src/
    │   ├── App.jsx             # Main Dashboard (8 Tabs)
    │   ├── AssessForm.jsx      # Live Assessment Form
    │   ├── api.js              # FastAPI Fetch Client
    │   ├── main.jsx            # React Entry Point
    │   └── index.css           # Tailwind CSS Imports
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vite.config.js
    └── package.json
```

---

## ⚙️ Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.10+ | [python.org](https://www.python.org/downloads/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| npm | 9+ | Included with Node.js |
| Git | Any | [git-scm.com](https://git-scm.com/) |

---

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/red-horse.git
cd red-horse
```

---

### 2. Backend Setup (FastAPI)

#### Step 1 — Create a Virtual Environment

```bash
cd backend

# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

#### Step 2 — Install Dependencies

```bash
pip install -r requirements.txt
```

The `requirements.txt` includes:

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
pydantic>=2.0.0
pandas>=2.2.0
numpy>=1.26.0
scikit-learn>=1.4.0
networkx>=3.3
```

#### Step 3 — Run the Backend Server

```bash
python main.py
```

Or using Uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Step 4 — Verify Backend is Running

Open your browser and navigate to:

```
http://localhost:8000/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "red_horse",
  "version": "1.0.0",
  "cors": "enabled"
}
```

> 📚 **Swagger UI** is available at: `http://localhost:8000/docs`

---

### 3. Frontend Setup (React + Vite)

#### Step 1 — Navigate to Frontend Directory

```bash
cd ../frontend
```

#### Step 2 — Install Node Dependencies

```bash
npm install
npm install recharts
npm install -D @tailwindcss/postcss autoprefixer
```

#### Step 3 — Configure Tailwind CSS

Create `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Create `postcss.config.js`:

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
}
```

Update `src/index.css`:

```css
@import "tailwindcss";
```

#### Step 4 — Run the Frontend Dev Server

```bash
npm run dev
```

Open your browser at:

```
http://localhost:5173
```

---

### 4. Running Both Services

Open **two separate terminals:**

```bash
# Terminal 1 — Backend
cd red_horse/backend
venv\Scripts\activate      # Windows
python main.py

# Terminal 2 — Frontend
cd red_horse/frontend
npm run dev
```

| Service | URL |
|---------|-----|
| 🐍 FastAPI Backend | `http://localhost:8000` |
| ⚛️ React Frontend | `http://localhost:5173` |
| 📚 Swagger UI | `http://localhost:8000/docs` |
| 💚 Health Check | `http://localhost:8000/v1/health` |

---

## 🧪 Testing the API

### Quick Test via Swagger UI

1. Open `http://localhost:8000/docs`
2. Click `POST /v1/assess` → **Try it out**
3. Paste the sample payload below → Click **Execute**

### Sample Payload — HIGH Risk Case

```json
{
  "user_id": "test-user-001",
  "kyc": {
    "national_id": "1234567890123",
    "age": 22,
    "occupation": "Student",
    "registered_address_zipcode": "10520",
    "kyc_timestamp": 1716192000,
    "kyc_channel": "Online"
  },
  "footprint": {
    "device_imei": "IMEI_FRAUD_001",
    "device_model": "Samsung Galaxy A05",
    "ip_address": "10.0.0.1",
    "carrier_name": "TrueMove H",
    "sim_serial_owner_match": false
  },
  "biometrics": {
    "typing_speed_wpm": 120,
    "keystroke_intervals": [45,48,46,47,45,44,46,48,45,47,
                            46,45,47,48,46,45,44,47,46,48],
    "copy_paste_detected": true,
    "touch_pressure_avg": 0.3,
    "screen_navigation_path": ["HOME","REGISTER","LIMITS"],
    "changed_limit_to_max": true,
    "minutes_since_account_open": 8.5,
    "balance_checks_without_funds": 4
  },
  "known_connected_user_ids": ["user-fraud-ring-A", "user-fraud-ring-B"]
}
```

### Expected Response

```json
{
  "policy": {
    "action": "BLOCK_OUTBOUND_TRANSACTION",
    "reason": "High probability of Mule Account (GNN Cluster Match / Behavioral Anomaly)",
    "require_kyc": "PHYSICAL_BRANCH_ONLY"
  },
  "risk_breakdown": {
    "final_score": 1.0
  }
}
```

### Test Blacklist Values

| Type | Known Fraud Values |
|------|--------------------|
| **IMEI** | `IMEI_FRAUD_001` through `IMEI_FRAUD_005` |
| **IP Address** | `10.0.0.1` · `192.168.100.1` · `172.16.0.99` |

---

## 🌐 Deployment

### Deploy Frontend to Vercel

#### Option 1 — Drag & Drop (Quickest)

```bash
# Build the production bundle
cd frontend
npm run build
# Drag the generated dist/ folder to vercel.com/new
```

#### Option 2 — Vercel CLI

```bash
npm install -g vercel
cd frontend
vercel --prod
```

#### Option 3 — GitHub Integration

1. Push the `frontend/` folder to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository and configure:

| Setting | Value |
|---------|-------|
| Framework Preset | `Vite` |
| Root Directory | `./` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### Deploy Backend to Railway / Render

Add a `Procfile` in the `backend/` directory:

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Then deploy to [Railway](https://railway.app) or [Render](https://render.com) by connecting your GitHub repository.

> ⚠️ **After deploying the backend**, update the `BASE_URL` in `frontend/src/api.js`:
>
> ```js
> const BASE_URL = "https://your-backend-url.railway.app";
> ```

---

## 📊 Dashboard Tabs

| Tab | Description |
|-----|-------------|
| **📊 Overview** | Risk gauge · Signal flags · Population scatter plot |
| **🧠 Engine A** | Keystroke chart · Benford's Law · Bayesian update chain |
| **🕸️ Engine B** | GNN graph topology · Score component breakdown |
| **⚖️ Fusion** | Live formula · Weight distribution · Policy thresholds |
| **🗂️ 3 Cases** | Side-by-side HIGH / MEDIUM / LOW risk comparison |
| **🚀 Simulate** | Animated real-time pipeline execution |
| **📋 Audit Log** | Full trace with INFO / WARN / CRIT filtering |
| **🔬 Assess** | Live form → real FastAPI backend → full result display |

---

## 🔧 Policy Thresholds

| Score | Action | Enforcement |
|-------|--------|-------------|
| P ≥ 0.80 | 🚫 **BLOCK** | Block all outbound transactions · Physical branch KYC required |
| 0.40 ≤ P < 0.80 | ⚠️ **LIMIT** | ฿5,000/day transaction cap · Facial recognition per transaction |
| P < 0.40 | ✅ **ALLOW** | Normal account activity permitted |

---

## 🔑 Key Detection Signals

| Signal | Type | Fraud Indicator |
|--------|------|-----------------|
| Keystroke σ² ≤ 15 ms² | Biometric | Robotic / scripted input |
| Bayesian P(Mule) ≥ 65% | Statistical | Multiple behavioral triggers active |
| Benford TVD ≥ 0.15 | Statistical | Artificial numeric configuration |
| GNN Cluster Score ≥ 0.60 | Graph | Connected to known fraud community |
| SIM card mismatch | Identity | SIM not registered to account holder |
| Copy-paste in registration | Behavioral | Clipboard data used in KYC form |
| Max limit set within 60 min | Behavioral | Immediate maximum limit configuration |
| Repeated zero-balance checks | Behavioral | Account monitoring without funds |

---

## 📄 License

This project is developed for academic and research purposes.

---

*🐴 Red Horse Project · Predictive Anti-Fraud & Network Surveillance System · v1.0.0*
