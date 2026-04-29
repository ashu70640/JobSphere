# JobSphere — Project Change Log & Architecture Guide

> Maintained for Claude Code sessions. Tracks all intentional changes made to
> the codebase beyond the initial project scaffold.

---

## Project Overview

**JobSphere** is an AI-powered job application tracker built as a MERN
microservices application.

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Frontend    | React 19, Vite 7, Tailwind CSS 4, React Router 7 |
| Auth API    | Node 18, Express 5, Mongoose 8 — port **5001** |
| Jobs API    | Node 18, Express 5, Mongoose 8 — port **5002** |
| Admin API   | Node 18, Express 5, Mongoose 8 — port **5003** |
| Database    | MongoDB (`authdb` + `jobsdb`)           |
| Cache       | Redis on 6379 (partially integrated)   |
| AI          | Google Gemini 2.5 Flash                 |
| Proxy       | Nginx on port 80                        |
| DevOps      | Docker Compose                          |

---

## Key Architectural Decisions

- **JWT Strategy**: 15-min access token + 40-byte refresh token stored in
  `User.refreshTokens[]`. Shared `JWT_SECRET` between services — no
  inter-service HTTP calls for token validation.
- **AI rate limiting**: Per-user 20 requests/day via `AiUsage` collection
  (not Redis).
- **Dark mode**: Class-based (`"dark"` on `<html>`), persisted to
  `localStorage`, configured via Tailwind v4 `@custom-variant`.

---

## All Changes Made (chronological)

### 1. Interview Management System

**Backend** — `services/jobs/src/models/Job.js`
- Added 5 optional interview fields (all with defaults for backward
  compatibility):
  - `interviewTime` — HH:MM string
  - `interviewType` — enum: phone, video, on-site, technical, panel, final
  - `interviewRound` — Number, default 1
  - `interviewStatus` — enum: scheduled, completed, cancelled, rescheduled
  - `interviewerName` — String

**Frontend — new components** (`client/src/components/interview/`)
| File | Purpose |
|------|---------|
| `InterviewCountdown.jsx` | Urgency pill + exported `getUrgency()` helper. Levels: overdue → today → tomorrow → week → later |
| `ChecklistItem.jsx` | Persists checked state to `localStorage` per job (`prep-{id}-{i}`). Zero API calls |
| `InterviewCard.jsx` | Two variants via `compact` prop. Full variant shows type/round badges, action bar (Done, Reschedule, Offer/Rejected) |
| `UpcomingInterviewsWidget.jsx` | Sticky sidebar widget. Groups interviews by urgency level |
| `InterviewStatsBar.jsx` | 4 KPI cards: Today, This Week, Needs Attention, Offer Rate % |
| `RescheduleModal.jsx` | Modal with scroll-lock, Escape key, `.interview-modal-enter` CSS animation |

**Frontend — new page** `client/src/pages/Interviews.jsx`
- `/interviews` route with grouped grid view + optimistic updates
- `handleMarkComplete`, `handleConvertStatus`, `handleReschedule` handlers
- `PageSkeleton` with `animate-pulse` loading state

**Frontend — updated pages**
| File | Change |
|------|--------|
| `Dashboard.jsx` | Replaced floating sidebar with `UpcomingInterviewsWidget` + `RescheduleModal`. Added `handleMarkComplete`, `handleConvertStatus`, `handleReschedule` |
| `EditJob.jsx` | Added `InterviewSection` sub-component — conditionally visible when `status === "interview"` |
| `AddJob.jsx` | Same `InterviewSection` pattern as EditJob |
| `JobDetails.jsx` | Added `InterviewPrepPanel` with prep checklist + "Generate AI Prep Questions" (reuses `/summarize` endpoint) + `InterviewCountdown` on job header |
| `App.jsx` | Added `/interviews` route |
| `Navbar.jsx` | Added Interviews nav link |
| `index.css` | Added `@keyframes modalIn` + `.interview-modal-enter` class |

---

### 2. Pagination Component

**File created**: `client/src/components/Pagination.jsx`

- Smart ellipsis algorithm: always shows first, last, current ±1 pages
- "Showing X–Y of Z jobs" range indicator
- Desktop: full bar · Mobile: compact `Prev | Page X of Y | Next`
- Full ARIA: `aria-current`, `aria-label`, `aria-disabled`
- Returns `null` when `totalPages ≤ 1`

**Dashboard.jsx** — replaced old 14-line pagination block with `<Pagination />`.

---

### 3. FilterBar Component

**File created**: `client/src/components/FilterBar.jsx`

- Search input with embedded icon + inline clear ✕
- Status / JobType / Sort dropdowns with active-dot indicator
- Reset Filters button (conditional on `isAnyFilterActive`)
- Active filter tag chips (Row 2, conditional only)
- "X jobs found" inline via `ml-auto`
- Custom select chevron via SVG data-URI (no wrapper div needed)

**Dashboard.jsx** — replaced old 53-line filter block with `<FilterBar />`.

**Refinement applied** (compactness pass):
- Container: `py-2.5`, no shadow, `rounded-xl`
- Inputs: `h-9`, no shadow
- Row 2 only renders when `isAnyFilterActive` (eliminates phantom space)
- Result count moved inline into Row 1

---

### 4. Profile Page Redesign

**File modified**: `client/src/pages/Profile.jsx`

All business logic (API calls, state, auth) unchanged. UI improvements:
- **Gradient banner** (`h-28`, `from-blue-500 to-indigo-600`) at card top
- **Avatar**: `w-20 h-20`, gradient `from-blue-400 to-indigo-600`,
  `ring-4 ring-white shadow-md`, overlaps banner via `-mt-10`
- **Camera badge**: UI placeholder only, no backend wiring
- **Edit button**: moved to top-right of avatar row, includes `PenIcon`
- **InfoField** component: uppercase label + medium-weight value, subtle hover
- **Skeleton loader**: `ProfileSkeleton` — mirrors full card shape with pulse
- **Edit mode inputs**: consistent `h-10 rounded-xl` style matching FilterBar
- **Toast**: conditionally green (success) or red (error)

---

### 5. Dark Mode / Light Mode

**Strategy**: Tailwind v4 class-based dark mode. `"dark"` class on `<html>`.

**Dark palette**:
| Element | Light | Dark |
|---------|-------|------|
| Page background | `gray-50` | `gray-900` |
| Cards | `white` | `gray-800` |
| Borders | `gray-100/200` | `gray-700` |
| Primary text | `gray-800/900` | `gray-100` |
| Secondary text | `gray-600` | `gray-300` |
| Muted text | `gray-400/500` | `gray-400/500` |
| Inputs | `gray-50 / white` | `gray-700 / gray-800` |
| Skeletons | `gray-200` | `gray-600` |

**New files created**:

| File | Purpose |
|------|---------|
| `client/src/context/ThemeContext.jsx` | `ThemeProvider` + `useTheme()` hook. Writes `"dark"` class to `<html>`. Persists to `localStorage` |
| `client/src/components/ThemeToggle.jsx` | Sun/Moon icon button. Reads/writes theme via `useTheme()` |

**Files modified**:

| File | Change |
|------|--------|
| `client/src/index.css` | Added `@custom-variant dark (&:where(.dark, .dark *));` (Tailwind v4 class-based dark mode) |
| `client/src/main.jsx` | Wrapped `<App />` with `<ThemeProvider>` |
| `client/src/App.jsx` | Root div: `dark:bg-gray-900 dark:text-gray-100 transition-colors duration-200` |
| `client/src/components/Navbar.jsx` | Dark styles on nav, logo, links; added `<ThemeToggle />` |
| `client/src/pages/Dashboard.jsx` | Dark styles on background, greeting, job cards, skeleton, status badges, error/empty states |
| `client/src/components/FilterBar.jsx` | Dark styles on toolbar, inputs, select chevrons (separate light/dark data-URIs), filter tags, Reset button, Row 2 divider |
| `client/src/components/Pagination.jsx` | Dark styles on nav buttons, page number buttons, ellipsis dots, range text, mobile indicator |
| `client/src/pages/Profile.jsx` | Dark styles on page background, card, banner skeleton, avatar ring, camera badge, identity text, section divider, InfoField cards, form inputs, Cancel button, footer hint |
| `client/src/pages/Stats.jsx` | Dark styles on page background, stat cards, chart cards, headers, Recharts axis/grid/tooltip overrides |
| `client/src/pages/Login.jsx` | Dark styles on page background, branding, card, inputs, labels, register link |
| `client/src/pages/Register.jsx` | Dark styles on page background, branding, card, inputs (all three fields), labels, login link |

---

## Constraints Followed Throughout

- Backend code never modified
- No new npm packages introduced (no theme libraries)
- No folder/file renames
- No API or data model changes
- No auth logic changes
- Tailwind CSS only — no inline `style={}` for theming

---

### 6. Dark Mode — Full Coverage (Interview Components + Forms)

**Completed the remaining dark mode gaps from change #5.**

**Files updated**:

| File | Change |
|------|--------|
| `client/src/pages/AddJob.jsx` | Dark styles on page bg, card, all form inputs/selects/labels, InterviewSection violet panel, date/time inputs |
| `client/src/pages/EditJob.jsx` | Same dark form coverage as AddJob — page bg, card, all inputs/selects/labels, InterviewSection |
| `client/src/pages/JobDetails.jsx` | Dark styles on STATUS_STYLES badges, job card, resume match panel, InterviewPrepPanel, AI summary block, notes sidebar |
| `client/src/pages/Interviews.jsx` | Dark styles on PageSkeleton, SectionDivider, page header, empty state |
| `client/src/components/interview/InterviewCard.jsx` | Dark TYPE_CONFIG badge colors, compact/full card bg/borders, action buttons |
| `client/src/components/interview/UpcomingInterviewsWidget.jsx` | Dark container, header, count badge, section labels, EmptyState |
| `client/src/components/interview/InterviewStatsBar.jsx` | Dark StatCard bg/border, value and label text |
| `client/src/components/interview/RescheduleModal.jsx` | Dark panel, header/footer borders, inputs/selects/labels, Cancel button |

---

---

### 7. Production-Level Testing Suite

**New folder**: `tests/` — self-contained package with all test layers.

**Stack**:
- **Vitest** — backend unit + integration + security (native ESM, no Babel needed)
- **Vitest + React Testing Library** — frontend component tests
- **Playwright** — E2E browser automation
- **K6** — load + rate-limit validation
- **mongodb-memory-server** — in-memory MongoDB for isolation

**Architecture decisions**:
- Integration tests build dedicated test Express apps that wire actual service
  routes/controllers/models against an in-memory MongoDB instance. This avoids
  importing `index.js` (which calls `app.listen()`) while still testing real code.
- Gemini API is mocked via `vi.stubGlobal('fetch', ...)` — no real API calls in CI.
- Unit tests use `vi.mock()` to stub every external dependency (User model, JWT,
  bcrypt, AiUsage model).
- Each integration test file gets its own MongoDB instance (`connect()` /
  `disconnect()` in `beforeAll` / `afterAll`) for full isolation.

**Files created**:

| File | Purpose |
|------|---------|
| `tests/package.json` | Test runner dependencies (vitest, supertest, playwright, RTL, mongodb-memory-server, express, jsonwebtoken, mongoose…) |
| `tests/vitest.config.js` | Backend Vitest config — node env, include unit + integration + security |
| `tests/vitest.frontend.config.js` | Frontend Vitest config — jsdom env, React plugin |
| `tests/playwright.config.js` | Playwright config — chromium, baseURL http://localhost |
| `tests/run-tests.sh` | Shell runner with sub-commands: `unit`, `integration`, `security`, `frontend`, `e2e`, `load`, `coverage`, `all` |
| `tests/utils/testDb.js` | `connect()` / `disconnect()` / `clearDatabase()` using mongodb-memory-server |
| `tests/utils/mockData.js` | Shared fixtures: users, jobs (pending/interview/offer/declined), notes, resume text, Gemini mock responses |
| `tests/utils/tokenHelper.js` | `generateAccessToken`, `generateExpiredToken`, `generateTamperedToken`, `generateOrphanToken`, `generateRefreshToken` |
| `tests/utils/globalSetup.js` | Sets `JWT_SECRET`, `NODE_ENV=test`, `GEMINI_API_KEY` once for all workers |
| `tests/utils/setup.js` | Per-file setup: spies on console.log/info |
| `tests/unit/auth/authController.test.js` | register (success, dup email, 500), login (success, not found, wrong pw), getCurrentUser, updateUser, refreshAccessToken |
| `tests/unit/auth/authMiddleware.test.js` | Missing header, no "Bearer" prefix, expired, tampered, malformed |
| `tests/unit/jobs/jobController.test.js` | createJob, getAllJobs (filters, search, pagination, sort), getJob, updateJob, deleteJob, addNote, deleteNote, updateNote, showStats |
| `tests/unit/jobs/aiRateLimit.test.js` | Under limit, at limit (429), over limit, daily reset, new user record, boundary (19th) |
| `tests/integration/auth/auth.integration.test.js` | register, login (token expiry claim), /me (no token, expired, malformed, no password leak), updateUser, refresh |
| `tests/integration/jobs/jobs.integration.test.js` | CRUD, filters (status/jobType/search), pagination (page+limit), sort a-z, cross-user isolation |
| `tests/integration/jobs/notes.integration.test.js` | Add note (missing text, missing field, not found), update (empty text, wrong noteId), delete, cross-user |
| `tests/integration/jobs/stats.integration.test.js` | Zero stats, accurate status counts, monthlyApplications, per-user isolation, upcoming-interviews limit 5 |
| `tests/integration/jobs/ai.integration.test.js` | Summarize (success, not found, Gemini fail), match-resume (success, no text, whitespace, not found), match-pdf (no file), rate limit 21st → 429, per-user quota isolation |
| `tests/security/jwt.security.test.js` | algorithm-none attack, payload manipulation, expired, orphan token, garbage token, empty bearer, non-bearer scheme, refresh misuse, cross-user CRUD |
| `tests/security/injection.security.test.js` | `$ne` injection, `$gt`, `$where`, `$regex` query injection, XSS storage, company/position maxlength, invalid enum, 200KB body, invalid ObjectId |
| `tests/e2e/auth.e2e.spec.js` | Register form, duplicate email, login, invalid creds, protected routes redirect, full register→profile journey |
| `tests/e2e/jobs.e2e.spec.js` | Dashboard empty state, add job, full CRUD journey, filter/search, notes |
| `tests/e2e/interviews.e2e.spec.js` | Interviews page, stats bar, empty state, dashboard widget, edit interview fields, prep panel, countdown pill |
| `tests/e2e/ai.e2e.spec.js` | Summarize button renders, resume match textarea, empty match error, dark mode toggle + persistence |
| `tests/load/login.load.test.js` | 200 VU ramp (10s→200 VUs→0), p95 < 1s, success rate > 95%, custom metrics |
| `tests/load/jobs.load.test.js` | 50 VU steady + 100 VU spike, create/list/delete cycle, p95 < 2s |
| `tests/load/ai.load.test.js` | 5 VU AI summarize, rate limit counter, `handleSummary` report |
| `tests/frontend/setup.js` | @testing-library/jest-dom, router mocks, localStorage mock, console.error filter |
| `tests/frontend/__mocks__/styleMock.js` | CSS module mock |
| `tests/frontend/__mocks__/fileMock.js` | Static asset mock |
| `tests/frontend/Login.test.jsx` | Rendering, form input, success → navigate + localStorage, failure → error message |
| `tests/frontend/Register.test.jsx` | Rendering, success → navigate, duplicate → error |
| `tests/frontend/Pagination.test.jsx` | Null on 1 page, prev/next, page numbers, range label, aria-current, ellipsis, click handlers, disabled states |
| `tests/frontend/FilterBar.test.jsx` | Rendering, no Reset when clean, Reset when active, chip row, onSearchChange, onStatusChange, onResetFilters, inline clear |
| `tests/frontend/ThemeToggle.test.jsx` | Renders, adds "dark" class, removes "dark" class, localStorage dark/light persistence, reads persisted pref on mount |
| `tests/frontend/InterviewCountdown.test.jsx` | `getUrgency()` for overdue/today/tomorrow/week/later; component renders correct pill for each case; null on no date |

**README.md updated**: added full Testing section with folder structure, setup instructions, all `npm run` commands, shell runner usage, coverage targets, and key scenario table.

---

### 8. Google Calendar Integration (Enterprise Step 1)

**Full OAuth 2.0 flow** — users connect Google Calendar once; interviews are
automatically synced as calendar events when jobs move into/out of "interview" status.

**Backend — Auth Service** (`services/auth/src/`)

| File | Purpose |
|------|---------|
| `services/googleCalendarService.js` | `encryptToken` / `decryptToken` (AES-256-GCM, random IV per call, format: `ivHex:ciphertextHex:authTagHex`). `createOAuth2Client`, `generateAuthUrl` (embeds `userId` in OAuth `state`), `exchangeCodeForTokens`, `refreshAccessToken` |
| `middleware/internalAuthMiddleware.js` | Validates `x-service-secret` header — guards the inter-service token endpoint |
| `controllers/calendarController.js` | `getAuthUrl`, `handleOAuthCallback`, `getCalendarStatus`, `toggleCalendarSync`, `disconnectCalendar`, `getCalendarTokensInternal` (auto-refreshes if expiring within 5 min) |
| `routes/calendarRoutes.js` | Public: `GET /auth-url`, `GET /callback`, `GET /status`, `PATCH /toggle`, `DELETE /disconnect`. Internal: `GET /internal/tokens/:userId` |

**`services/auth/src/models/User.js`** — added `googleCalendar` sub-document:
```js
googleCalendar: {
  accessToken:     { type: String,  default: null, select: false },
  refreshToken:    { type: String,  default: null, select: false },
  tokenExpiry:     { type: Date,    default: null },
  calendarEnabled: { type: Boolean, default: false },
}
```

**`services/auth/src/index.js`** — mounted calendar routes at both:
- `/api/v1/auth/calendar` (user-facing)
- `/api/v1/auth/internal` (inter-service)

**Backend — Jobs Service** (`services/jobs/src/`)

| File | Purpose |
|------|---------|
| `utils/retry.js` | `withRetry(fn, { maxAttempts, baseDelayMs, label })` — exponential backoff with ±25% jitter |
| `services/calendarService.js` | `fetchTokens(userId)` calls auth internal endpoint. `buildEventResource(job)` — 1-hour event, 24h email + 30min popup reminders. `createCalendarEvent`, `updateCalendarEvent`, `deleteCalendarEvent` — all wrapped in `withRetry`. Failures silently logged (best-effort, never blocks CRUD) |

**`services/jobs/src/models/Job.js`** — added `calendarEventId: { type: String, default: "" }`

**`services/jobs/src/controllers/jobController.js`** — calendar hooks:
- `createJob`: if `status==="interview" && interviewDate` → `createCalendarEvent` → save `eventId`
- `updateJob`: reschedule → `updateCalendarEvent`; newly promoted to interview → `createCalendarEvent`; moved away → `deleteCalendarEvent`
- `deleteJob`: if `calendarEventId` → `deleteCalendarEvent`

**Frontend** (`client/src/components/CalendarConnect.jsx`) — new self-contained widget:
- 3 states: loading skeleton, connected (toggle + disconnect), not connected (Connect button)
- Reads `?calendar=connected|error` query param on mount → shows toast → cleans URL
- Google-branded Connect button (`#4285F4`), `StatusBadge`, `ToggleSwitch` sub-components

**`client/src/pages/Profile.jsx`** — added "Integrations" section below the profile card that renders `<CalendarConnect />`.

**Env vars added**:
- Auth service: `TOKEN_ENCRYPTION_KEY` (64 hex chars for AES-256), `INTERNAL_SERVICE_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `CLIENT_URL`
- Jobs service: `AUTH_SERVICE_URL`, `INTERNAL_SERVICE_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Key design decisions**:
- `select: false` on token fields — never leaked in normal queries
- `prompt: 'consent'` + `access_type: 'offline'` — guarantees refresh token on first connect
- Access token auto-refreshed by auth service before returning to jobs service (5-min lookahead)
- Calendar failures never propagate to CRUD responses (best-effort with retry)

---

### 9. Admin Dashboard (Enterprise Step 2)

**New service**: `services/admin/` — Express on port **5003**. Safe to delete without affecting the core app (all files are tagged with a comment at the top).

**Backend** (`services/admin/src/`)

| File | Purpose |
|------|---------|
| `config/db.js` | Opens 3 mongoose connections: `adminConn` (writes), `authConn` + `jobsConn` (reads) |
| `models/Admin.js` | Admin user schema. `seedSuperAdmin()` creates a superadmin on first startup |
| `models/ModerationLog.js` | Audit trail for `delete_job`, `ban_user` actions |
| `models/readModels.js` | Mirror schemas for User, Job, AiUsage — bound to read connections |
| `models/modelRegistry.js` | Singleton registry; controllers call `getModels()` after boot |
| `middleware/adminAuthMiddleware.js` | Verifies `ADMIN_JWT_SECRET` — completely separate from main JWT |
| `controllers/adminAuthController.js` | `POST /api/admin/login`, `GET /api/admin/me` |
| `controllers/statsController.js` | overview, jobs-per-day, ai-usage, status-breakdown |
| `controllers/usersController.js` | paginated users list, soft-ban (`bannedAt`), user's jobs |
| `controllers/jobsController.js` | paginated all-jobs, hard-delete (logs to ModerationLog first) |
| `controllers/aiController.js` | daily AI usage, abuser detection (users at ≥20 cap this week) |

**Frontend** (`client/src/`)

| File | Purpose |
|------|---------|
| `admin/adminFetch.js` | Dedicated fetch helper — attaches `adminToken`, auto-redirects on 401 |
| `pages/Admin/AdminLogin.jsx` | Dark login form; stores `adminToken` in localStorage |
| `pages/Admin/AdminLayout.jsx` | Sidebar nav (Dashboard / Users / Jobs / AI Monitor) + Outlet |
| `pages/Admin/Dashboard.jsx` | 4 stat cards + line chart (jobs/day) + bar chart (status breakdown) |
| `pages/Admin/Users.jsx` | Paginated table with search + Ban button (soft-ban) |
| `pages/Admin/Jobs.jsx` | Paginated table with search + Delete button (hard-delete + audit) |
| `pages/Admin/AiMonitor.jsx` | Top 20 AI users table + rate-limit abuser section |

**`client/src/App.jsx`** — added `/admin/login` and `/admin/*` nested routes only. No other change.

**`docker-compose.yml`** — added `admin-service` container + `admin-service` to nginx depends_on.

**`nginx/nginx.conf`** — added `upstream admin_service` + `location /api/admin` proxy block.

**Tests** (`tests/unit/admin/`)

| File | Scenarios |
|------|-----------|
| `adminAuthController.test.js` | login success/wrong-pw/missing-fields, adminMe |
| `statsController.test.js` | overview shape, jobs-per-day format, status breakdown, AI usage email join |
| `usersController.test.js` | pagination math, ban sets bannedAt + logs, 409 double-ban, 400 invalid ID, getUserJobs |

**Env vars** (`services/admin/.env`):
- `MONGO_URI_AUTH`, `MONGO_URI_JOBS` — read-only connections
- `ADMIN_JWT_SECRET` — separate from main `JWT_SECRET`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — seed credentials

**Key design decisions**:
- Admin service uses a separate JWT secret — admin tokens cannot be used on the main API
- Soft-ban (`bannedAt`) never hard-deletes users — core auth service is untouched
- `bannedAt` field is written directly via admin's `authConn` (same authdb, additive field)
- Every hard-delete is preceded by a `ModerationLog` write (audit trail)
- `modelRegistry.js` pattern prevents "model not registered on connection" race conditions

---

## Known Gaps / Future Work

- Redis caching commented out in auth service (`services/auth/src/redis.js`)
- No refresh token handling in frontend (access token from localStorage only)
- Load test (`load-tests/login.test.js`) has hardcoded credentials in plain text
- `tests/` requires `npm install` inside the folder before first run
- E2E and load tests require Docker Compose to be running (`docker compose up --build -d`)
- AI E2E tests can be skipped with `SKIP_AI_E2E=true` when no valid Gemini key is set
- Calendar integration requires `npm install` in both `services/auth` and `services/jobs` (googleapis added)
- Google Cloud Console setup required: enable Calendar API, create OAuth 2.0 credentials, add redirect URI
- Admin service requires `npm install` inside `services/admin/` before first run
- Admin `bannedAt` field has no enforcement in core auth service (it's a data flag only — auth login does not check it; enforcement would need a change to auth service)
- Admin dashboard talks directly to `localhost:5003` (hardcoded in `adminFetch.js`) — for production, proxy through nginx like the other services
