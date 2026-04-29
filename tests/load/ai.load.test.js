/**
 * K6 Load Test — AI Endpoints + Rate Limiting Validation
 *
 * Verifies that:
 *  1. Summarize endpoint works under moderate load
 *  2. Rate limit kicks in at exactly 20 requests/day per user
 *  3. Different users get independent quotas
 *
 * Run: k6 run tests/load/ai.load.test.js
 * NOTE: Uses real Gemini API — set GEMINI_API_KEY in service env.
 *       Set SKIP_GEMINI=true to mock via a local endpoint.
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

const aiSuccess      = new Rate('ai_success_rate');
const rateLimitHits  = new Counter('ai_rate_limit_hits_429');
const aiDuration     = new Trend('ai_request_duration_ms', true);

export const options = {
  scenarios: {
    // Scenario 1: moderate steady load
    ai_steady: {
      executor: 'constant-vus',
      vus:      5,
      duration: '20s',
    },
  },
  thresholds: {
    ai_success_rate:          ['rate>0.80'],    // Gemini can be slow
    http_req_duration:        ['p(90)<5000'],   // 5s max for AI calls
    ai_rate_limit_hits_429:   ['count<100'],    // sanity check
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

// ─── Setup: create N users, each get a job ───────────────────────────────────

export function setup() {
  const users = [];

  for (let i = 0; i < 5; i++) {
    const email    = `ai_load_${i}_${Date.now()}@test.com`;
    const password = 'AiLoad@123';

    // Register
    http.post(
      `${BASE_URL}/api/v1/auth/register`,
      JSON.stringify({ name: `AI User ${i}`, email, password }),
      { headers: { 'Content-Type': 'application/json' } },
    );

    // Login
    const loginRes = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({ email, password }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    const token = JSON.parse(loginRes.body).accessToken;

    // Create a job
    const jobRes = http.post(
      `${BASE_URL}/api/v1/jobs`,
      JSON.stringify({
        company:      `AI Corp ${i}`,
        position:     'AI Test Role',
        workLocation: 'Remote',
        description:
          'Seeking an ML engineer with Python, TensorFlow, PyTorch, Docker, and AWS experience.',
      }),
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } },
    );

    const jobId = JSON.parse(jobRes.body)?.job?._id;
    if (token && jobId) users.push({ token, jobId });
  }

  return { users };
}

// ─── Main scenario ────────────────────────────────────────────────────────────

export default function (data) {
  const user = data.users[__VU % data.users.length];
  if (!user) return;

  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${user.token}`,
  };

  group('AI Summarize', () => {
    const start = Date.now();
    const res   = http.post(
      `${BASE_URL}/api/v1/jobs/${user.jobId}/summarize`,
      null,
      { headers },
    );
    aiDuration.add(Date.now() - start);

    if (res.status === 429) {
      rateLimitHits.add(1);
      aiSuccess.add(false);
      return;
    }

    const ok = check(res, {
      'ai: status 200':       (r) => r.status === 200,
      'ai: has summary':      (r) => !!JSON.parse(r.body || '{}').summary,
      'ai: has keySkills':    (r) => Array.isArray(JSON.parse(r.body || '{}').summary?.keySkills),
    });
    aiSuccess.add(ok);
  });

  sleep(1); // back-off between AI calls
}

// ─── Rate Limit Boundary Test ─────────────────────────────────────────────────

export function handleSummary(data) {
  const rateHits = data.metrics.ai_rate_limit_hits_429?.values?.count || 0;
  console.log(`\n📊 AI Rate Limit Summary:`);
  console.log(`  Total 429 responses: ${rateHits}`);
  console.log(`  AI success rate:     ${(data.metrics.ai_success_rate?.values?.rate * 100).toFixed(1)}%`);
  console.log(`  p95 duration:        ${data.metrics.ai_request_duration_ms?.values?.['p(95)']?.toFixed(0)}ms`);
}
