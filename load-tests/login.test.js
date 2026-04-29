import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 200,
  duration: "10s",
  // stages: [
  //   { duration: "5s", target: 10 }, // normal traffic
  //   { duration: "2s", target: 400 }, // sudden spike
  //   { duration: "10s", target: 10 }, // back to normal
  // ],
  // thresholds: {
  //   http_req_duration: ["p(95)<800"], // 95% requests < 800ms
  //   http_req_failed: ["rate<0.05"], // < 5% failures
  // },
  // stages: [
  //   { duration: "5s", target: 50 },
  //   { duration: "5s", target: 150 },
  //   { duration: "5s", target: 250 }, // peak
  //   { duration: "10s", target: 0 },
  // ],
};

export default function () {
  const payload = JSON.stringify({
    email: "prince70640@gmail.com",
    password: "Prince@123",
  });

  const headers = {
    "Content-Type": "application/json",
    Host: "localhost",
  };

  const res = http.post("http://localhost/api/v1/auth/login", payload, {
    headers,
  });
  const isSuccess = res.status === 200;

  if (!isSuccess) {
    console.error("Login failed:", res.status, res.body);
    return; // <-- stop here, don’t read res.json()
  }

  // Safe JSON parsing
  // Safe JSON parsing
  let json = {};
  try {
    json = res.json();
  } catch (e) {
    json = {};
  }

  check(res, {
    "request succeeded": (r) => r.status !== 0,
    "Login successful (200)": (r) => r.status === 200,
    "Token exists": (r) => json.token !== undefined,
  });
}
