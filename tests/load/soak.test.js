/**
 * Soak Test — sustained load for 1 hour to detect memory leaks / connection pool exhaustion.
 * Run: k6 run tests/load/soak.test.js
 * Expected: stable latency throughout, no memory growth, no connection errors
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const errorRate     = new Rate("error_rate");
const jobListTrend  = new Trend("job_list_duration");
const soakRequests  = new Counter("soak_requests_total");

export const options = {
  stages: [
    { duration: "5m",  target: 50  },  // ramp up
    { duration: "50m", target: 50  },  // hold for soak
    { duration: "5m",  target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_failed:   ["rate<0.01"],   // < 1% error over full soak
    http_req_duration: ["p(95)<1000"],  // stay under 1s p95 throughout
    error_rate:        ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost";

export function setup() {
  // Login once and return token for use in default function
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: __ENV.TEST_EMAIL || "test@example.com", password: __ENV.TEST_PASS || "test123" }),
    { headers: { "Content-Type": "application/json" } }
  );
  if (res.status === 200) {
    return { token: res.json("accessToken") };
  }
  return { token: null };
}

export default function (data) {
  const headers = {
    "Content-Type": "application/json",
    ...(data.token ? { Authorization: `Bearer ${data.token}` } : {}),
  };

  const res = http.get(`${BASE_URL}/api/v1/jobs?page=1&limit=10`, { headers });

  const ok = check(res, {
    "jobs list 200": (r) => r.status === 200,
    "has jobs key":  (r) => r.json("jobs") !== undefined,
  });

  errorRate.add(!ok);
  jobListTrend.add(res.timings.duration);
  soakRequests.add(1);

  sleep(1);
}
