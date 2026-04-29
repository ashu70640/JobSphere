# JobSphere

A full-stack **AI-Powered Job Application Tracker** built with a MERN microservices architecture. Track your job applications, manage interview schedules, take notes per job, and leverage AI-powered resume matching and job summarization via Google Gemini.

---

## Features

- **User Authentication** — Register, login, JWT-based access + refresh tokens
- **Job Tracking** — Create, read, update, and delete job applications
- **Status Pipeline** — Track jobs through `pending → interview → offer / declined`
- **Job Notes** — Add, edit, and delete notes per job application
- **Filters & Search** — Filter by status, job type, and text search by company or position
- **Pagination & Sorting** — 6 jobs per page with multiple sort options
- **Statistics Dashboard** — Bar and line charts showing application trends and status breakdowns
- **Interview Management** — Full interview scheduling with type, round, status, urgency countdown, and prep checklist
- **AI Interview Prep** — Generate interview prep questions from a job description using Gemini
- **AI Job Summarization** — Extract key skills, responsibilities, and tech stack from a job description (Gemini 2.5 Flash)
- **AI Resume Matching** — Match your resume (plain text or PDF) against a job description and get a scored analysis
- **Rate Limiting** — 20 AI calls per user per day; Nginx rate-limits the login endpoint
- **Dark / Light Mode** — System-aware theme toggle persisted to `localStorage`
- **Containerized** — Full Docker Compose setup with Nginx reverse proxy

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 18 |
| Framework | Express.js 5 |
| Database | MongoDB 7 + Mongoose 8 |
| Caching | Redis 7 + ioredis |
| Auth | JWT (access + refresh tokens) + bcrypt |
| AI | Google Generative AI — Gemini 2.5 Flash |
| File Upload | Multer + pdf-parse |
| Process Model | Node `cluster` module (auth service) |

### Frontend
| Layer | Technology |
|---|---|
| Library | React 19 |
| Build Tool | Vite 7 |
| Routing | React Router DOM 7 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts 3 |
| HTTP | Native Fetch API |

### DevOps
| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Container orchestration |
| Nginx | Reverse proxy + rate limiting |
| K6 | Load testing |

---

## Architecture

```
                          ┌─────────────────────────────────────┐
                          │               Client                │
                          │          React + Vite (3000)        │
                          └──────────────────┬──────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │            Nginx (port 80)          │
                          │   /api/v1/auth/*  /api/v1/jobs/*    │
                          └────────┬────────────────┬───────────┘
                                   │                │
                    ┌──────────────▼──┐        ┌────▼─────────────┐
                    │  Auth Service   │        │  Jobs Service    │
                    │   (port 5001)   │        │   (port 5002)    │
                    │  MongoDB:authdb │        │ MongoDB:jobsdb   │
                    │  Redis          │        │ Gemini AI        │
                    └─────────────────┘        └──────────────────┘
```

Both services share the same JWT secret so either service can verify tokens independently, without inter-service calls.

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- OR: Node.js 18+, MongoDB, and Redis installed locally

### Run with Docker (recommended)

```bash
# Clone the repo
git clone <repo-url>
cd JobSphere

# Copy and fill in environment files (see Environment Variables below)
cp services/auth/.env.example services/auth/.env
cp services/jobs/.env.example services/jobs/.env

# Start all services
docker compose up --build
```

The app will be available at `http://localhost` (port 80 via Nginx).

### Run Locally (without Docker)

**1. Start MongoDB and Redis** (must be running on default ports).

**2. Auth Service**
```bash
cd services/auth
npm install
# create .env (see below)
npm run dev   # starts on port 5001
```

**3. Jobs Service**
```bash
cd services/jobs
npm install
# create .env (see below)
npm run dev   # starts on port 5002
```

**4. Client**
```bash
cd client
npm install
npm run dev   # starts on port 3000
```

> When running locally the client connects directly to `http://localhost:5001` and `http://localhost:5002`.

---

## Environment Variables

### `services/auth/.env`
```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/authdb
JWT_SECRET=your_jwt_secret_here
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### `services/jobs/.env`
```env
PORT=5002
MONGO_URI=mongodb://localhost:27017/jobsdb
JWT_SECRET=your_jwt_secret_here          # must match auth service
GEMINI_API_KEY=your_google_gemini_api_key
```

> Both services must share the same `JWT_SECRET` so either can verify tokens.

---

## API Reference

All requests must include `Authorization: Bearer <accessToken>` except for `/register`, `/login`, and `/refresh`.

### Auth Service — `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Create a new account |
| POST | `/login` | No | Login; returns `accessToken` + `refreshToken` |
| POST | `/refresh` | No | Exchange refresh token for new access token |
| GET | `/me` | Yes | Get the logged-in user's profile |
| PATCH | `/updateUser` | Yes | Update name, email, or location |

### Jobs Service — `/api/v1/jobs`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Yes | List jobs (filterable, paginated) |
| POST | `/` | Yes | Create a job application |
| GET | `/stats` | Yes | Aggregated stats (by status + monthly) |
| GET | `/upcoming-interviews` | Yes | Next 5 upcoming interviews |
| GET | `/:id` | Yes | Get a single job |
| PATCH | `/:id` | Yes | Update a job (including interview fields) |
| DELETE | `/:id` | Yes | Delete a job |
| PATCH | `/:id/notes` | Yes | Add a note to a job |
| PATCH | `/:jobId/notes/:noteId` | Yes | Update a note |
| DELETE | `/:jobId/notes/:noteId` | Yes | Delete a note |
| POST | `/:id/summarize` | Yes | AI: summarize job description (also used for interview prep questions) |
| POST | `/:id/match-resume` | Yes | AI: match plain-text resume |
| POST | `/:id/match-resume-pdf` | Yes | AI: match PDF resume (upload `resume` field) |

#### Query Parameters for `GET /api/v1/jobs`

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by `pending`, `interview`, `declined`, or `offer` |
| `jobType` | string | Filter by `full-time`, `part-time`, `remote`, or `internship` |
| `search` | string | Case-insensitive search on `position` or `company` |
| `sort` | string | `latest` (default), `oldest`, `a-z`, `z-a` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 6) |

---

## Project Structure

```
JobSphere/
├── client/                     # React + Vite frontend
│   └── src/
│       ├── pages/              # Login, Register, Dashboard, Stats, Profile,
│       │                       # AddJob, EditJob, JobDetails, Interviews
│       ├── components/
│       │   ├── interview/      # InterviewCard, InterviewCountdown,
│       │   │                   # InterviewStatsBar, UpcomingInterviewsWidget,
│       │   │                   # RescheduleModal, ChecklistItem
│       │   ├── FilterBar.jsx   # Search + filter + tag chips toolbar
│       │   ├── Pagination.jsx  # Smart ellipsis pagination bar
│       │   ├── ThemeToggle.jsx # Sun/Moon dark mode toggle button
│       │   └── Navbar.jsx      # Top navigation
│       ├── context/
│       │   ├── AuthContext.jsx # JWT auth state
│       │   └── ThemeContext.jsx# Dark/light theme provider
│       └── Helper/             # SafeFetch wrapper
│
├── services/
│   ├── auth/                   # Authentication microservice
│   │   └── src/
│   │       ├── controllers/    # authController.js
│   │       ├── routes/         # authRoutes.js
│   │       ├── middleware/     # authMiddleware.js
│   │       ├── models/         # User.js
│   │       ├── config/         # db.js (MongoDB)
│   │       ├── redis.js        # ioredis client
│   │       ├── index.js        # Express app
│   │       └── server.js       # Cluster entry point
│   │
│   └── jobs/                   # Job management microservice
│       └── src/
│           ├── controllers/    # jobController.js, getUpcomingInterviews.js
│           ├── routes/         # jobRoutes.js
│           ├── middleware/     # authMiddleware.js, upload.js, aiRateLimit.js
│           ├── models/         # Job.js, AiUsage.js
│           └── config/         # db.js (MongoDB)
│
├── nginx/
│   └── nginx.conf              # Reverse proxy + rate limit config
├── redis/                      # Redis config
├── load-tests/                 # K6 load test scripts
└── docker-compose.yml          # Full stack orchestration
```

---

## Data Models

### User
```js
{
  name: String,          // required
  email: String,         // required, unique
  password: String,      // bcrypt hashed
  location: String,      // default: "my city"
  refreshTokens: [{ token, createdAt }]
}
```

### Job
```js
{
  company: String,         // required, max 50 chars
  position: String,        // required, max 100 chars
  status: String,          // pending | interview | declined | offer
  jobType: String,         // full-time | part-time | remote | internship
  workLocation: String,
  description: String,     // required
  interviewDate: Date,
  interviewTime: String,   // HH:MM format
  interviewType: String,   // phone | video | on-site | technical | panel | final
  interviewRound: Number,  // default: 1
  interviewStatus: String, // scheduled | completed | cancelled | rescheduled
  interviewerName: String,
  notes: [{ text, createdAt }],
  createdBy: ObjectId      // ref: User
}
```

---

## AI Features

AI endpoints are protected by a **20 requests/day per-user** rate limit tracked in the `AiUsage` collection. The limit resets at midnight.

| Feature | Endpoint | Input | Output |
|---------|----------|-------|--------|
| Summarize Job | `POST /:id/summarize` | Job description (auto) | Key skills, experience level, tech stack |
| Interview Prep | `POST /:id/summarize` | Job description (auto) | AI-generated prep questions |
| Match Resume (text) | `POST /:id/match-resume` | `{ resumeText }` in body | Match score + gap analysis |
| Match Resume (PDF) | `POST /:id/match-resume-pdf` | PDF file (`resume` field) | Match score + gap analysis |

---

## Interview Management

When a job's status is set to `interview`, additional fields are unlocked in AddJob/EditJob:

| Field | Description |
|-------|-------------|
| Interview Date | Date of the interview |
| Interview Time | Time in HH:MM format |
| Interview Type | phone / video / on-site / technical / panel / final |
| Interview Round | Round number (1, 2, 3…) |
| Interview Status | scheduled / completed / cancelled / rescheduled |
| Interviewer Name | Name of the interviewer |

The **Interviews page** (`/interviews`) groups all scheduled interviews by urgency:
- **Overdue** — past the interview date
- **Today** — interview is today
- **Tomorrow** — interview is tomorrow
- **This Week** — within the next 7 days
- **Upcoming** — beyond one week

The **Dashboard** sidebar shows the next 5 upcoming interviews with quick-action buttons (Mark Done, Reschedule, Offer/Rejected).

---

## Dark Mode

JobSphere supports full dark/light mode:

- Toggle via the Sun/Moon button in the navbar
- Preference is persisted to `localStorage`
- Uses Tailwind CSS v4 class-based dark mode (`dark` class on `<html>`)
- All pages and components are fully dark-mode compatible

---

## Load Testing

K6 scripts are available under `load-tests/` and the enhanced test suite under `tests/load/`.

```bash
# Run login load test (requires k6 installed)
k6 run load-tests/login.test.js

# Enhanced load tests with custom metrics
k6 run tests/load/login.load.test.js
k6 run tests/load/jobs.load.test.js
k6 run tests/load/ai.load.test.js
```

The default script targets 200 concurrent virtual users against the login endpoint.

---

## Testing

JobSphere ships with a production-level, multi-layer testing suite located in `tests/`.

### Test Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest | Isolated controller + middleware logic |
| Integration | Vitest + Supertest + mongodb-memory-server | Full HTTP request/response cycles |
| Security | Vitest + Supertest | JWT attacks, injection, boundary inputs |
| Frontend | Vitest + React Testing Library | Component behaviour and UI interactions |
| E2E | Playwright | Full browser user journeys |
| Load | K6 | Throughput, latency, and rate-limit validation |

### Folder Structure

```
tests/
├── vitest.config.js             # Backend test config (node env)
├── vitest.frontend.config.js    # Frontend test config (jsdom env)
├── playwright.config.js         # E2E test config
├── package.json                 # All test dependencies
├── run-tests.sh                 # Unified shell runner
│
├── utils/
│   ├── testDb.js                # mongodb-memory-server helpers
│   ├── mockData.js              # Shared test fixtures
│   ├── tokenHelper.js           # JWT generation helpers
│   ├── setup.js                 # Vitest per-file setup
│   └── globalSetup.js           # Vitest global setup (env vars)
│
├── unit/
│   ├── auth/
│   │   ├── authController.test.js   # register, login, getMe, updateUser, refresh
│   │   └── authMiddleware.test.js   # JWT extraction, validation, error cases
│   └── jobs/
│       ├── jobController.test.js    # CRUD, notes, stats
│       └── aiRateLimit.test.js      # 20/day cap, reset, per-user isolation
│
├── integration/
│   ├── auth/
│   │   └── auth.integration.test.js # All auth endpoints end-to-end
│   └── jobs/
│       ├── jobs.integration.test.js # CRUD, filters, pagination, sorting
│       ├── notes.integration.test.js# Notes add / update / delete
│       ├── ai.integration.test.js   # Summarize, match-resume, rate limit
│       └── stats.integration.test.js# Stats + upcoming-interviews
│
├── security/
│   ├── jwt.security.test.js         # Tampering, algorithm-none, expiry, cross-user
│   └── injection.security.test.js   # NoSQL injection, XSS, oversized inputs, enum bypass
│
├── e2e/
│   ├── auth.e2e.spec.js             # Register, login, protected routes
│   ├── jobs.e2e.spec.js             # CRUD, search, notes
│   ├── interviews.e2e.spec.js       # Interview page, widget, prep panel
│   └── ai.e2e.spec.js               # AI summarize, resume match, theme toggle
│
├── load/
│   ├── login.load.test.js           # 200 VUs ramp, custom metrics
│   ├── jobs.load.test.js            # Create/list/delete under 50-100 VUs
│   └── ai.load.test.js              # AI endpoints + rate limit boundary
│
└── frontend/
    ├── setup.js                     # RTL + jest-dom + router mocks
    ├── Login.test.jsx
    ├── Register.test.jsx
    ├── Pagination.test.jsx
    ├── FilterBar.test.jsx
    ├── ThemeToggle.test.jsx
    └── InterviewCountdown.test.jsx
```

### Setup & Installation

```bash
cd tests
npm install

# Install Playwright browsers (E2E only)
npx playwright install --with-deps chromium
```

### Running Tests

#### Quick Start (no Docker needed)

```bash
cd tests

# All backend tests (unit + integration + security)
npm run test:backend

# Frontend component tests
npm run test:frontend

# Watch mode during development
npm run test:watch
```

#### Individual Layers

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Security tests only
npm run test:security

# Coverage reports
npm run test:coverage
npm run test:coverage:frontend
```

#### E2E Tests (Docker required)

```bash
# Start the full stack first
docker compose up --build -d

# Run Playwright tests
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui
```

#### Load Tests (Docker required, K6 required)

```bash
# Install K6: https://k6.io/docs/getting-started/installation/
docker compose up --build -d

npm run test:load:login
npm run test:load:jobs
npm run test:load:ai
```

#### Shell Runner (all-in-one)

```bash
cd tests
chmod +x run-tests.sh

./run-tests.sh              # backend (unit + integration + security)
./run-tests.sh unit         # unit tests only
./run-tests.sh integration  # integration tests only
./run-tests.sh frontend     # frontend tests only
./run-tests.sh security     # security tests only
./run-tests.sh e2e          # E2E (Docker must be running)
./run-tests.sh load         # K6 load tests
./run-tests.sh coverage     # coverage for both backend + frontend
./run-tests.sh all          # everything
```

### Coverage Targets

| Layer | Target |
|-------|--------|
| Auth Controller | > 90% |
| Jobs Controller | > 90% |
| AI Middleware | > 95% |
| Frontend Components | > 80% |

Coverage reports are written to `tests/coverage/backend/` and `tests/coverage/frontend/`.

### Key Test Scenarios

| Scenario | Where |
|----------|-------|
| Register duplicate email → 400 | `integration/auth` |
| Access token expiry → 401 | `security/jwt` |
| JWT algorithm-none attack | `security/jwt` |
| NoSQL `$ne` injection on login | `security/injection` |
| AI rate limit — 20th request OK, 21st → 429 | `integration/jobs/ai` |
| Rate limit isolation per user | `integration/jobs/ai` |
| Cross-user job access → 404 | `security/jwt` |
| Pagination correct page slicing | `frontend/Pagination` |
| Dark mode persists after reload | `e2e/ai.e2e.spec.js` |
| 200 VU login ramp | `load/login.load.test.js` |

---

## License

MIT
