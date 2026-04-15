<![CDATA[<div align="center">

# 🤖 Hire-AI — Agentic AI Hiring Platform

**An end-to-end, AI-powered recruitment pipeline built on LangGraph agentic workflows, Groq LLMs, and a modern React dashboard.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-1C3C3C?logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3-F55036?logo=groq&logoColor=white)](https://groq.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Agentic Pipeline](#agentic-pipeline)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

**Hire-AI** is a full-stack hiring platform that replaces manual resume screening with an intelligent, multi-stage agentic pipeline. Recruiters create AI-generated job descriptions, upload candidate data via Excel, and let the system autonomously parse resumes, analyze GitHub profiles, score candidates with weighted algorithms, and generate personalized interview questions — all while maintaining **human-in-the-loop (HITL)** approval gates at every critical decision point.

The platform processes **500+ candidates per batch** in under 3 minutes, with real-time SSE streaming to a glassmorphic React dashboard providing full transparency into the AI's reasoning process.

---

## Key Features

| Feature | Description |
|---|---|
| **AI Job Description Builder** | Generate, iterate, and refine JDs using Groq LLaMA 3.3 70B with HITL approval loops |
| **Batch Candidate Ingestion** | Upload candidates via Excel + PDF resumes; parsed in-memory (zero storage cost) |
| **GitHub Profile Analysis** | Automated repo analysis — language aggregation, activity scoring, authenticity & risk detection |
| **Multi-Dimensional Scoring** | Weighted composite scores across resume, GitHub, skills, experience, education, and AI enrichment |
| **Bias-Free Mode** | Toggle anonymized candidate views — names, institutions, and PII redacted at query time |
| **AI Interview Forge** | Context-aware interview question generation synthesizing JD + resume + GitHub data |
| **Offer Letter Studio** | AI-driven offer letter generation with Playwright PDF rendering |
| **Real-Time Transparency** | SSE-powered investigative console showing live agentic reasoning logs |
| **Campaign Management** | Bulk email campaigns to shortlisted candidates via configurable SMTP |
| **Audit Trail** | Append-only, immutable audit logs with full per-candidate traceability |
| **RBAC** | Role-based access control (Admin / HR / Viewer) with JWT + refresh token auth |

---

## Architecture

Hire-AI follows a **Modular Monolith** architecture with clean service boundaries, enabling future microservice extraction without logic rewrites.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TailwindCSS)                    │
│  ┌──────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────┐ │
│  │JD    │ │Candidate │ │Dashboard  │ │Comparison│ │Interview    │ │
│  │Builder│ │Upload    │ │& Summary  │ │View      │ │Questions    │ │
│  └──┬───┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘ └──────┬──────┘ │
└─────┼──────────┼─────────────┼────────────┼──────────────┼────────┘
      │          │             │            │              │
      ▼          ▼             ▼            ▼              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (FastAPI)                           │
│         /api/v1/jd  /api/v1/candidates  /api/v1/scores  ...        │
│                     Auth · Rate Limit · CORS                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────┐   ┌──────────────────┐   ┌─────────────┐
│  LangGraph  │   │  Service Modules │   │  Celery      │
│ Orchestrator│   │                  │   │  Workers     │
│             │   │ • JD Service     │   │              │
│ agent nodes │   │ • Candidate Svc  │   │ • Resume     │
│ HITL gates  │◄─►│ • Resume Parser  │◄─►│   parsing    │
│ state mgmt  │   │ • GitHub Analyzer│   │ • GitHub     │
│             │   │ • AI Enrichment  │   │   analysis   │
│             │   │ • Scoring Engine │   │ • Batch       │
│             │   │ • Interview Svc  │   │   scoring    │
│             │   │ • Email Service  │   │ • Email send │
│             │   │ • Audit Service  │   │              │
└──────┬──────┘   └────────┬─────────┘   └──────┬──────┘
       │                   │                     │
       ▼                   ▼                     ▼
┌─────────────┐   ┌──────────────────┐   ┌─────────────┐
│  Groq API   │   │   PostgreSQL     │   │   Redis     │
│  (LLM)      │   │                  │   │  • Queue    │
│             │   │  All tables      │   │  • Cache    │
│             │   │  Audit logs      │   │  • Sessions │
└─────────────┘   └──────────────────┘   └─────────────┘
```

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** (0.110) | Async REST API with OpenAPI docs |
| **LangGraph** (0.2) | Agentic pipeline orchestration with checkpoint-based HITL |
| **Groq** (LLaMA 3.3 70B / 3.1 8B) | LLM provider for JD gen, enrichment, interview questions |
| **SQLAlchemy** (2.0, async) | ORM with PostgreSQL via psycopg3 |
| **PostgreSQL** (16) | Primary data store + LangGraph checkpointing |
| **Redis** | Celery broker, LLM response cache, rate limiting |
| **Celery** (5.3) | Distributed task queue for batch processing |
| **PyMuPDF** | In-memory PDF resume extraction (zero disk storage) |
| **Playwright** | PDF rendering for offer letter generation |
| **Pydantic v2** | Request/response validation + app settings |
| **structlog** | Structured JSON logging |

### Frontend
| Technology | Purpose |
|---|---|
| **React** (19) + **Vite** (8) | SPA framework + bundler |
| **TailwindCSS** (3.4) | Utility-first styling with glassmorphic design system |
| **Zustand** (5) | Lightweight client-side state management |
| **TanStack Query** (5) | Server state + cache with auto-refresh |
| **React Router** (7) | Client-side routing with protected routes |
| **Recharts** (3) | Data visualization (radar charts, score breakdowns) |
| **Lucide React** | Icon library |
| **Axios** | HTTP client with JWT interceptors + silent refresh |

---

## Project Structure

```
agent/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI app factory + startup hooks
│   │   ├── config.py                   # Pydantic BaseSettings configuration
│   │   ├── agents/
│   │   │   ├── graph.py                # LangGraph StateGraph + checkpointing
│   │   │   ├── nodes.py                # Agent node functions (35KB of logic)
│   │   │   ├── state.py                # HiringPipelineState TypedDict
│   │   │   └── hitl.py                 # Human-in-the-loop interrupt handlers
│   │   ├── core/
│   │   │   ├── security.py             # JWT creation/verification, password hashing
│   │   │   └── mailer.py               # SMTP email delivery engine
│   │   ├── db/
│   │   │   ├── models.py               # SQLAlchemy ORM (10 tables)
│   │   │   ├── session.py              # Async session factory
│   │   │   ├── init_db.py              # Auto-migration on startup
│   │   │   └── migrations/             # Alembic migrations
│   │   ├── middleware/
│   │   │   ├── auth.py                 # JWT + RBAC dependency injection
│   │   │   ├── rate_limit.py           # Per-endpoint rate limiting
│   │   │   └── audit.py                # Request-level audit logging
│   │   ├── modules/
│   │   │   ├── auth/                   # Registration, login, token refresh
│   │   │   ├── jd/                     # JD generation, versioning, HITL
│   │   │   ├── candidates/             # Upload, CRUD, comparison, shortlisting
│   │   │   ├── resume_parser/          # PyMuPDF in-memory parsing
│   │   │   ├── github_analyzer/        # GitHub API + repo feature extraction
│   │   │   ├── ai_enrichment/          # Selective Groq LLM enrichment
│   │   │   ├── scoring/                # Weighted scoring + bias-free dual mode
│   │   │   ├── interview/              # Question generation + approval
│   │   │   ├── email/                  # Campaign templates + SMTP delivery
│   │   │   └── audit/                  # Append-only audit trail
│   │   ├── utils/                      # Shared utilities
│   │   └── workers/
│   │       └── celery_app.py           # Celery configuration + task registry
│   ├── requirements.txt
│   ├── runtime.txt                     # Python 3.12.2
│   └── .env                            # Local environment variables
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # Router + ProtectedRoute wrapper
│   │   ├── main.jsx                    # React entry point
│   │   ├── api/
│   │   │   ├── client.js               # Axios + JWT interceptors + silent refresh
│   │   │   ├── candidates.js           # Candidate API bindings
│   │   │   └── jd.js                   # JD API bindings
│   │   ├── stores/
│   │   │   ├── authStore.js            # Zustand — JWT, user profile, role
│   │   │   └── pipelineStore.js        # Zustand — live pipeline state
│   │   ├── hooks/
│   │   │   ├── useCandidates.js        # React Query — candidate CRUD
│   │   │   ├── useJD.js                # React Query — JD operations
│   │   │   └── usePipelineSSE.js       # SSE hook for real-time progress
│   │   ├── pages/                      # 15 page components
│   │   │   ├── DashboardPage.jsx       # Overview metrics + pipeline status
│   │   │   ├── JDBuilderPage.jsx       # AI JD generation + HITL
│   │   │   ├── CandidateDashboard.jsx  # Candidate table + filters
│   │   │   ├── CandidateDetailPage.jsx # Full profile + score breakdown
│   │   │   ├── InterviewQuestionsPage  # Interview forge studio
│   │   │   ├── OfferLetterPage.jsx     # Offer letter editor + PDF export
│   │   │   ├── CampaignPage.jsx        # Email campaign management
│   │   │   ├── SettingsPage.jsx        # SMTP config + user preferences
│   │   │   └── ...                     # Login, Signup, Compare, Shortlist, Audit
│   │   └── components/
│   │       ├── layout/AppShell.jsx     # Sidebar + content shell
│   │       ├── candidates/             # CandidateTable, ScoreRadar, etc.
│   │       ├── jd/                     # JDForm, JDPreview, VersionHistory
│   │       └── common/                 # Shared UI components
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json                     # SPA rewrite rules
│   └── .env                            # VITE_API_URL
│
├── render.yaml                         # Render deployment blueprint
├── .gitignore
└── README.md                           # ← You are here
```

---

## Agentic Pipeline

The core of Hire-AI is a **LangGraph StateGraph** that orchestrates the entire hiring workflow as a directed acyclic graph with **human-in-the-loop interrupt gates**:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ JD Generator │────►│ JD Approval  │────►│Resume Parser │
│  (Groq 70B)  │◄────│   (HITL)     │     │  (PyMuPDF)   │
└──────────────┘     └──────────────┘     └──────┬───────┘
      ▲ feedback loop                            │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Scoring     │◄────│ AI Enricher  │◄────│   GitHub     │
│  Engine      │     │ (Groq, sel.) │     │  Analyzer    │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Shortlist   │────►│  Question    │────►│  Question    │
│  Approval    │     │  Generator   │     │  Approval    │
│   (HITL)     │     │  (Groq 70B)  │     │   (HITL)     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                                 ▼
                     ┌──────────────┐     ┌──────────────┐
                     │    Audit     │◄────│    Email     │
                     │  Finalizer   │     │   Sender     │
                     └──────────────┘     └──────────────┘
```

### Pipeline Stages

| # | Stage | Engine | Async? | Uses LLM? |
|---|---|---|---|---|
| 1 | JD Generation | Groq LLaMA 3.3 70B | No | ✅ |
| 2 | JD Approval | Human-in-the-Loop | No | ❌ |
| 3 | Resume Parsing | PyMuPDF + regex | ✅ Celery | ❌ |
| 4 | GitHub Analysis | GitHub REST API | ✅ Celery | ❌ |
| 5 | AI Enrichment | Groq LLaMA 3.1 8B (selective) | ✅ Celery | ✅ |
| 6 | Scoring | Weighted formula engine | ✅ Celery | ❌ |
| 7 | Shortlist Approval | Human-in-the-Loop | No | ❌ |
| 8 | Interview Question Gen | Groq LLaMA 3.3 70B | No | ✅ |
| 9 | Question Approval | Human-in-the-Loop | No | ❌ |
| 10 | Email Delivery | SMTP | ✅ Celery | ❌ |
| 11 | Audit Finalization | DB insert | ✅ | ❌ |

> **Selective AI Enrichment:** Groq is only called when rule-based parsing is insufficient (sparse resumes, borderline candidates). This reduces LLM costs by ~70%.

---

## Getting Started

### Prerequisites

- **Python** 3.12+
- **Node.js** 18+
- **PostgreSQL** 16+
- **Redis** 7+

### 1. Clone the Repository

```bash
git clone https://github.com/Kjagadeeshkumarreddy/hire-Ai.git
cd hire-Ai
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate
# Activate (macOS/Linux)
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend auto-creates all database tables and the LangGraph checkpoint schema on startup.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure API endpoint
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 4. Start Celery Workers (Optional — for batch processing)

```bash
cd backend
celery -A app.workers.celery_app worker -c 4 --loglevel=info
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/hiring_ai`) |
| `REDIS_URL` | ✅ | Redis connection string (e.g. `redis://localhost:6379/0`) |
| `GROQ_API_KEY` | ✅ | [Groq API key](https://console.groq.com/keys) for LLM access |
| `GITHUB_TOKEN` | ✅ | [GitHub PAT](https://github.com/settings/tokens) for repo analysis (5,000 req/hr) |
| `SECRET_KEY` | ✅ | Random secret for JWT signing |
| `ALGORITHM` | — | JWT algorithm (default: `HS256`) |
| `ALLOWED_ORIGINS` | — | CORS origins (default: `*`) |
| `SMTP_HOST` | — | SMTP server for email campaigns |
| `SMTP_PORT` | — | SMTP port (default: `587`) |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASSWORD` | — | SMTP password |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend API base URL (e.g. `http://localhost:8000/api/v1`) |

---

## API Reference

All endpoints are prefixed with `/api/v1` and require JWT authentication (except auth routes).

### Authentication — `/api/v1/auth`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create new account |
| POST | `/auth/login` | Login → access + refresh token |
| POST | `/auth/refresh` | Refresh expired access token |

### Job Descriptions — `/api/v1/jd`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/jd/generate` | Generate JD via Groq LLM |
| POST | `/jd/{job_id}/improve` | Refine JD with feedback |
| GET | `/jd/{job_id}/versions` | List all JD versions |
| PATCH | `/jd/{job_id}/versions/{v}/approve` | HITL approve |

### Candidates — `/api/v1/candidates`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/candidates/{job_id}/upload` | Upload Excel + PDFs |
| GET | `/candidates/{job_id}/list` | Paginated candidate list |
| GET | `/candidates/{candidate_id}` | Full candidate detail |
| POST | `/candidates/{job_id}/compare` | Multi-candidate comparison data |
| PATCH | `/candidates/{id}/shortlist` | Toggle shortlist status |

### Scoring — `/api/v1/scores`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/scores/{job_id}/run` | Trigger scoring pipeline |
| GET | `/scores/{job_id}/ranking` | Ranked candidate list |
| GET | `/scores/{candidate_id}/breakdown` | Detailed score breakdown |
| PATCH | `/scores/{job_id}/config` | Update scoring weights |

### Interview & Email
| Method | Endpoint | Description |
|---|---|---|
| POST | `/interview/{candidate_id}/generate` | Generate questions |
| PATCH | `/interview/{id}/approve` | HITL approve questions |
| POST | `/email/{job_id}/send-shortlist` | Send campaign emails |

### Pipeline & Audit
| Method | Endpoint | Description |
|---|---|---|
| GET | `/pipeline/{run_id}/status` | SSE stream for live progress |
| GET | `/audit/{job_id}/logs` | Paginated audit logs |

> **Interactive Docs:** Visit `http://localhost:8000/api/v1/openapi.json` or `http://localhost:8000/docs` for the auto-generated Swagger UI.

---

## Deployment

### Production Architecture

| Component | Service |
|---|---|
| **Frontend** | Vercel (static SPA) |
| **Backend** | Render Web Service |
| **Database** | Supabase / Render PostgreSQL / AWS RDS |
| **Cache/Queue** | Upstash Redis / ElastiCache |

### Deploy to Render

The project includes a `render.yaml` blueprint:

```bash
# Automatic: Connect your GitHub repo to Render and it will detect render.yaml
# Manual: Create a Web Service pointing to the /backend directory
#   Build: pip install -r requirements.txt
#   Start: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Deploy Frontend to Vercel

```bash
cd frontend
npm run build

# Via Vercel CLI
npx vercel --prod

# Set environment variable in Vercel dashboard:
# VITE_API_URL = https://your-render-backend.onrender.com/api/v1
```

The `vercel.json` is pre-configured with SPA rewrite rules for client-side routing.

---

## Database Schema

10 tables powering the platform:

| Table | Description |
|---|---|
| `users` | Auth + RBAC (admin, hr, viewer) + per-user SMTP config |
| `jobs` | Job postings with scoring config, ingestion tracking |
| `jd_versions` | Versioned JD content with LLM provenance |
| `candidates` | Candidate profiles with anonymized IDs for bias-free mode |
| `resumes` | Extracted resume data (skills, education, work history) — **no PDF storage** |
| `github_analysis` | Repository metrics, language stats, authenticity scores |
| `scores` | Multi-dimensional scores with config snapshots for reproducibility |
| `interview_questions` | AI-generated questions with HITL status |
| `email_logs` | Campaign delivery tracking with retry logic |
| `pipeline_runs` | LangGraph execution state + checkpoint thread IDs |
| `audit_logs` | Immutable, append-only audit trail |

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Modular monolith | Single deployable, in-process agent calls, simple CI/CD |
| Resume storage | **Parse & discard** (no PDF persistence) | Zero storage cost; PyMuPDF in-memory extraction |
| LLM provider | Groq only | Fastest inference; LLaMA 3.3 70B quality at low cost |
| LLM usage | **Selective enrichment** | Only ~30% of candidates hit the LLM; rule-based for the rest |
| GitHub analysis | Single API call per candidate | `/users/{u}/repos` provides all needed signals |
| Scoring | Deterministic weighted formulas | Auditable, reproducible, no LLM randomness |
| HITL | LangGraph checkpoint interrupts | Native pause/resume with PostgreSQL persistence |
| Bias-free | Query-time field masking | No duplicate data store; instant toggle |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<div align="center">

**Built with ❤️ by [Jagadeesh Kumar Reddy](https://github.com/Kjagadeeshkumarreddy)**

</div>
]]>
