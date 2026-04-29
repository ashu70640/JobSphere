/**
 * Spike Test — sudden surge from 0 to 500 VUs then back to 0.
 * Tests system behavior under unexpected traffic bursts.
 * Run: k6 run tests/load/spike.test.js
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate    = new Rate("error_rate");
const loginLatency = new Trend("login_latency");

export const options = {
  stages: [
    { duration: "10s", target: 10   },  // warm up
    { duration: "30s", target: 500  },  // spike
    { duration: "20s", target: 500  },  // hold
    { duration: "10s", target: 0    },  // recover
  ],
  thresholds: {
    http_req_failed:   ["rate<0.05"],   // < 5% error rate during spike
    http_req_duration: ["p(95)<2000"],  // p95 under 2s during spike
    error_rate:        ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost";

export default function () {
  const payload = JSON.stringify({
    email:    "test@example.com",
    password: "testpass123",
  });
  const params = { headers: { "Content-Type": "application/json" } };

  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, params);

  const ok = check(res, {
    "status is 200 or 400": (r) => r.status === 200 || r.status === 400,
    "not 500":              (r) => r.status !== 500,
    "not 503":              (r) => r.status !== 503,
  });

  errorRate.add(!ok);
  loginLatency.add(res.timings.duration);

  sleep(0.5);
}
