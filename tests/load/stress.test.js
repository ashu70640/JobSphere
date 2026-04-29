/**
 * Stress Test — gradually increase load until the system breaks.
 * Find the breaking point and observe recovery.
 * Run: k6 run tests/load/stress.test.js
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("error_rate");

export const options = {
  stages: [
    { duration: "2m",  target: 100  },
    { duration: "2m",  target: 200  },
    { duration: "2m",  target: 400  },
    { duration: "2m",  target: 600  },
    { duration: "2m",  target: 800  },
    { duration: "2m",  target: 1000 },
    { duration: "2m",  target: 0    },  // recovery
  ],
  thresholds: {
    // These will fail — that's the point. Stress test finds the breaking point.
    http_req_duration: ["p(99)<5000"],
    error_rate:        ["rate<0.3"],    // allow up to 30% errors at saturation
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost";

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  const ok = check(res, {
    "alive":    (r) => r.status < 500,
    "not hung": (r) => r.timings.duration < 5000,
  });

  errorRate.add(!ok);
  sleep(0.1);
}
