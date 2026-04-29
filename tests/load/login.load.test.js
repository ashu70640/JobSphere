/**
 * K6 Load Test — Login Endpoint
 * Tests: 200 concurrent users over 30 seconds
 *
 * Run: k6 run tests/load/login.load.test.js
 * With env: k6 run -e BASE_URL=http://localhost tests/load/login.load.test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ─── Custom metrics ───────────────────────────────────────────────────────────

const loginSuccessRate = new Rate('login_success_rate');
const loginFailRate    = new Rate('login_fail_rate');
const tokenPresent     = new Rate('token_present');
const loginDuration    = new Trend('login_duration_ms', true);
const rateLimitHits    = new Counter('rate_limit_hits');

// ─── Test config ──────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50  }, // ramp to 50 VUs
        { duration: '15s', target: 200 }, // hold at 200 VUs
        { duration: '5s',  target: 0   }, // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration:   ['p(95)<1000'],    // 95% of requests under 1s
    login_success_rate:  ['rate>0.95'],     // 95% success rate
    http_req_failed:     ['rate<0.05'],     // less than 5% failures
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

// ─── Main scenario ────────────────────────────────────────────────────────────

export default function () {
  const payload = JSON.stringify({
    email:    __ENV.TEST_EMAIL    || 'loadtest@jobsphere.test',
    password: __ENV.TEST_PASSWORD || 'LoadTest@123',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags:    { endpoint: 'login' },
  };

  const start = Date.now();
  const res   = http.post(`${BASE_URL}/api/v1/auth/login`, payload, params);
  loginDuration.add(Date.now() - start);

  // ── Assertions ──────────────────────────────────────────────────────────────

  const passed = check(res, {
    'status is 200':         (r) => r.status === 200,
    'has accessToken':       (r) => JSON.parse(r.body || '{}').accessToken !== undefined,
    'has refreshToken':      (r) => JSON.parse(r.body || '{}').refreshToken !== undefined,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  loginSuccessRate.add(res.status === 200);
  loginFailRate.add(res.status !== 200);

  if (res.status === 429) rateLimitHits.add(1);

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    tokenPresent.add(!!body.accessToken);
  }

  sleep(0.5); // think time between requests
}

// ─── Setup: register the test user once ──────────────────────────────────────

export function setup() {
  const registerPayload = JSON.stringify({
    name:     'Load Test User',
    email:    __ENV.TEST_EMAIL    || 'loadtest@jobsphere.test',
    password: __ENV.TEST_PASSWORD || 'LoadTest@123',
  });

  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    registerPayload,
    { headers: { 'Content-Type': 'application/json' } },
  );

  // 201 = created, 400 = already exists — both are fine
  if (res.status !== 201 && res.status !== 400) {
    console.error(`Setup failed: ${res.status} ${res.body}`);
  }
}
