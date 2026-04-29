#!/usr/bin/env bash
# ─── JobSphere — Full Test Runner ─────────────────────────────────────────────
# Usage:
#   ./run-tests.sh            — run unit + integration + security + frontend
#   ./run-tests.sh unit       — unit tests only
#   ./run-tests.sh integration— integration tests only
#   ./run-tests.sh security   — security tests only
#   ./run-tests.sh frontend   — frontend tests only
#   ./run-tests.sh e2e        — E2E tests (Docker must be running)
#   ./run-tests.sh load       — K6 load tests (Docker must be running)
#   ./run-tests.sh all        — everything
#   ./run-tests.sh coverage   — backend + frontend with coverage reports
# ─────────────────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"   # ensure we run from tests/ directory

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

banner() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}\n"; }
success() { echo -e "${GREEN}✔  $1${NC}"; }
fail()    { echo -e "${RED}✘  $1${NC}"; exit 1; }
warn()    { echo -e "${YELLOW}⚠  $1${NC}"; }

# ─── Pre-flight: install deps if needed ──────────────────────────────────────
if [ ! -d "node_modules" ]; then
  banner "Installing test dependencies"
  npm install
fi

TARGET="${1:-backend}"

case "$TARGET" in

  unit)
    banner "Unit Tests"
    npm run test:unit || fail "Unit tests failed"
    success "Unit tests passed"
    ;;

  integration)
    banner "Integration Tests"
    npm run test:integration || fail "Integration tests failed"
    success "Integration tests passed"
    ;;

  security)
    banner "Security Tests"
    npm run test:security || fail "Security tests failed"
    success "Security tests passed"
    ;;

  backend)
    banner "Backend Tests (unit + integration + security)"
    npm run test:backend || fail "Backend tests failed"
    success "Backend tests passed"
    ;;

  frontend)
    banner "Frontend Tests"
    npm run test:frontend || fail "Frontend tests failed"
    success "Frontend tests passed"
    ;;

  e2e)
    banner "E2E Tests (Playwright)"
    warn "Ensure Docker Compose is running: docker compose up --build -d"
    npx playwright install --with-deps chromium
    npm run test:e2e || fail "E2E tests failed"
    success "E2E tests passed"
    ;;

  load)
    banner "Load Tests (K6)"
    warn "Ensure Docker Compose is running: docker compose up --build -d"
    if ! command -v k6 &>/dev/null; then
      fail "k6 not found. Install from https://k6.io/docs/getting-started/installation/"
    fi
    echo "--- Login load test ---"
    npm run test:load:login
    echo "--- Jobs load test ---"
    npm run test:load:jobs
    success "Load tests completed"
    ;;

  coverage)
    banner "Coverage Report — Backend"
    npm run test:coverage:backend
    banner "Coverage Report — Frontend"
    npm run test:coverage:frontend
    success "Coverage reports generated in ./coverage/"
    ;;

  all)
    banner "Full Test Suite"
    warn "Ensure Docker Compose is running for E2E tests"

    npm run test:backend   || fail "Backend tests failed"
    success "Backend tests passed"

    npm run test:frontend  || fail "Frontend tests failed"
    success "Frontend tests passed"

    npx playwright install --with-deps chromium
    npm run test:e2e       || warn "E2E tests had failures (Docker may not be running)"

    success "All tests completed!"
    ;;

  *)
    echo "Unknown target: $TARGET"
    echo "Usage: $0 [unit|integration|security|backend|frontend|e2e|load|coverage|all]"
    exit 1
    ;;

esac
