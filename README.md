# TalentMatrix — Multi-Round Placement Allocation & Proctored Coding Anomaly Detector

TalentMatrix is a production-grade full-stack web platform built for university Training & Placement (T&P) departments. It serves as a unified **T&P Command Center** that brings three critical operational systems together into one intuitive SaaS interface:

1. **Multi-Company Placement & Offer Allocation** (Gale-Shapley Stable Matching + Dream/Core Policy Engine)
2. **Dynamic Multi-Round Interview Scheduling** (Conflict Detection & Panel Delay Rescheduler)
3. **Coding Assessment Integrity & Anomaly Detection** (Multi-Signal Telemetry & Code Authenticity Scorer)

---

## 🌟 Key Capabilities

### 1. Multi-Company Placement Allocation Engine
- **Gale-Shapley Algorithm**: Modified company-proposing deferred acceptance matching considering student rankings and recruiter ratings.
- **Configurable Offer Policies**: Enforces tier rules (*Super Dream*, *Dream*, *Core*, *Standard*) preventing downward offers while supporting policy-compliant upgrades.
- **Deadlock & Conflict Prevention**: Auto-detects over-allocations, circular dependencies, and duplicate assignments.
- **Interactive Multi-Step Visualization**: Animated 8-stage matching flow with detailed before/after match statistics and conflict resolution cards.

### 2. Dynamic Multi-Round Interview Scheduler
- **Full Calendar & Panel Timelines**: Day, week, panel, and candidate scheduling views.
- **Automated Conflict Detection**: Identifies double-booked candidates, overlapping slots, and impossible round transitions.
- **Real-Time Dynamic Rescheduling**: When a panel is delayed (e.g. Panel D delayed by 20 mins), the engine cascades schedule adjustments, finds alternate conflict-free slots, and provides 1-click schedule updates.
- **Utilization Heatmaps & Metrics**: Tracks total slots, booked slots, idle panel hours, and average interview duration.

### 3. Assessment Integrity, Anomaly Center & Live Candidate Sandbox
- **Live Candidate Coding Sandbox (`/candidate-sandbox`)**: Interactive code execution environment capturing real-time browser telemetry (keystroke flight intervals, paste counts and byte payloads, window blur/tab defocus durations, code injection bursts).
- **Socket.IO Real-Time Stream**: Live telemetry events immediately recalculate candidate Code Authenticity Scores (0–100) and broadcast alerts to proctors.
- **AI Provider Abstraction Layer (`AIService`)**: Integrates with **Google Gemini** (`gemini-1.5-pro`), **OpenAI** (`gpt-4o`), and deterministic mathematical telemetry intelligence (`telemetry-engine-v2.0`). Gracefully reports unconfigured states without fabricating fake results.
- **Security-Style Anomaly Center (`/anomalies`)**: Triage active alerts by severity (*Critical*, *High*, *Moderate*), inspect candidate telemetry timelines down to the second, and submit human review decisions (*Reviewed*, *Escalated*, *Dismissed*).
- **Fairness & Privacy by Design**: Emphasizes anomaly indicators as assistive decision-support tools rather than automated punitive measures.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Recharts, Lucide React, Zustand |
| **Backend** | Node.js, Express, TypeScript, Zod, tsx |
| **Database & ORM**| SQLite (via `dev.db`), Prisma ORM (easily swappable to PostgreSQL) |
| **Testing** | Node.js Native Test Runner (`node:test`, `node:assert`) |

```
talentmatrix/
├── client/                     # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/         # Layout (Sidebar, Topbar), CommandPalette, Cards
│   │   ├── pages/              # 12 Dedicated Pages (Dashboard, Students, Companies,
│   │   │                       # Drives, Allocation, Scheduler, Assessments,
│   │   │                       # AnomalyCenter, Analytics, Reports, Audit, Settings)
│   │   ├── hooks/              # useApi, useAnimatedCounter, useDebounce, useKeyboardShortcut
│   │   ├── lib/api.ts          # Centralized API client
│   │   ├── store/appStore.ts   # Zustand state management (Theme, Sidebar, Season, Palette)
│   │   └── index.css           # Design tokens, typography, dark mode & animations
│   └── vite.config.ts          # Vite configuration with API proxy
│
└── server/                     # Express + TypeScript backend
    ├── src/
    │   ├── engine/             # Core Algorithmic Engines
    │   │   ├── allocation-engine.ts       # Gale-Shapley + Offer Policy Engine
    │   │   ├── scheduling-engine.ts       # Slot Allocator + Dynamic Rescheduler
    │   │   ├── anomaly-engine.ts          # Telemetry Ingestion + Risk Scorer
    │   │   └── *.test.ts                  # Engine Unit Test Suites
    │   ├── modules/            # API Route Handlers (students, companies, recruitment,
    │   │                       # allocation, scheduling, assessments, anomaly, analytics,
    │   │                       # notifications, audit)
    │   ├── seed/index.ts       # Realistic Indian University Dataset (550+ students, 16 companies)
    │   └── app.ts              # Express Server entry
    └── prisma/
        └── schema.prisma       # Full Relational Schema
```

---

## 🚀 Quick Start Guide

### Option 1: One-Click Launch (Windows)

Simply double-click [`start.bat`](file:///C:/Users/naren/.gemini/antigravity-ide/scratch/talentmatrix/start.bat) in the project root:
- Checks and installs dependencies automatically if missing
- Pushes database schema & seeds data if needed
- Launches the backend server (Port 3001)
- Launches the frontend server (Port 5173)
- Opens [http://localhost:5173](http://localhost:5173) in your default browser

To stop all servers at once, double-click [`stop.bat`](file:///C:/Users/naren/.gemini/antigravity-ide/scratch/talentmatrix/stop.bat).

---

### Option 2: Manual Terminal Launch

```bash
# Clone the repository
cd talentmatrix

# Install Server dependencies
cd server
npm install

# Push Database Schema & Seed Data (550+ students, 16 companies, 300+ interviews)
npx prisma db push
npm run seed

# Install Client dependencies
cd ../client
npm install
```

### 2. Run the Development Servers

In terminal 1 (Backend):
```bash
cd server
npm run dev
# Server runs on http://localhost:3001
```

In terminal 2 (Frontend):
```bash
cd client
npm run dev
# Frontend runs on http://localhost:5173
```

### 3. Run Engine Unit Tests

```bash
cd server
npm test
```

---

## 📊 Pre-Loaded Demo Dataset

The database comes pre-seeded with rich, realistic Indian university placement season data:
- **550 Students** across CSE, IT, ECE, ME, EE, and AI&DS departments with realistic GPAs, skill sets, and statuses
- **16 Leading Recruiting Companies** (Google, Microsoft, Amazon, Adobe, Goldman Sachs, JP Morgan Chase, Flipkart, Razorpay, PhonePe, Infosys, TCS, Wipro, etc.)
- **21 Recruitment Drives** spanning *Super Dream* (40+ LPA), *Dream* (20-40 LPA), *Core* (10-20 LPA), and *Standard* (<10 LPA) tiers
- **1,500+ Student Applications** across multiple recruitment stages
- **300+ Scheduled Interviews** across 12 physical and virtual panels
- **80 Coding Assessment Sessions** with over 2,400 granular telemetry events and pre-flagged anomalies for triage
- **System Audit Logs & Notifications** reflecting live campus placement operations

---

## ⌨️ Keyboard Shortcuts & Features

- `Ctrl + K` / `Cmd + K`: Global Command Palette to search across all views and trigger direct actions
- **Dark Mode Switcher**: Seamless dark mode support in sidebar with persistent local storage
- **Responsive Layout**: Designed for executive high-resolution displays down to tablet viewports
