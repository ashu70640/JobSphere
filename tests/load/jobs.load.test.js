/**
 * K6 Load Test — Jobs CRUD Under Load
 * Simulates authenticated users creating, listing, and deleting jobs.
 *
 * Run: k6 run tests/load/jobs.load.test.js
 * Env vars: BASE_URL, TEST_EMAIL, TEST_PASSWORD
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const createJobSuccess = new Rate('create_job_success');
const listJobsSuccess  = new Rate('list_jobs_success');
const deleteJobSuccess = new Rate('delete_job_success');
const jobCreateTime    = new Trend('job_create_duration_ms', true);
const jobListTime      = new Trend('job_list_duration_ms', true);

export const options = {
  scenarios: {
    steady_load: {
      executor: 'constant-vus',
      vus:      50,
      duration: '30s',
    },
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5s',  target: 100 },
        { duration: '10s', target: 100 },
        { duration: '5s',  target: 0   },
      ],
      startTime: '35s', // after steady_load ends
    },
  },
  thresholds: {
    http_req_duration:  ['p(95)<2000'],   // 95th percentile under 2s
    create_job_success: ['rate>0.90'],
    list_jobs_success:  ['rate>0.95'],
    http_req_failed:    ['rate<0.10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

// Shared state: access token acquired in setup()
let accessToken = '';

export function setup() {
  const email    = __ENV.TEST_EMAIL    || 'jobs_load@jobsphere.test';
  const password = __ENV.TEST_PASSWORD || 'LoadTest@123';

  // Register (idempotent)
  http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({ name: 'Jobs Load User', email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  // Login to get token
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const body = JSON.parse(res.body);
  return { token: body.accessToken };
}

export default function (data) {
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  let createdJobId = null;

  group('Create Job', () => {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/api/v1/jobs`,
      JSON.stringify({
        company:      `LoadCorp_${__VU}_${Date.now()}`,
        position:     'Load Test Engineer',
        workLocation: 'Remote',
        jobType:      'full-time',
        description:  'K6 load test job. Node.js, React, MongoDB required.',
      }),
      { headers },
    );
    jobCreateTime.add(Date.now() - start);

    const ok = check(res, {
      'create: status 201':   (r) => r.status === 201,
      'create: has job._id':  (r) => !!JSON.parse(r.body || '{}').job?._id,
    });
    createJobSuccess.add(ok);

    if (res.status === 201) {
      createdJobId = JSON.parse(res.body).job._id;
    }
  });

  sleep(0.2);

  group('List Jobs', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/jobs?page=1&limit=6`, { headers });
    jobListTime.add(Date.now() - start);

    const ok = check(res, {
      'list: status 200':        (r) => r.status === 200,
      'list: has jobs array':    (r) => Array.isArray(JSON.parse(r.body || '{}').jobs),
      'list: has totalJobs':     (r) => JSON.parse(r.body || '{}').totalJobs !== undefined,
      'list: response < 1000ms': (r) => r.timings.duration < 1000,
    });
    listJobsSuccess.add(ok);
  });

  sleep(0.2);

  group('Delete Job', () => {
    if (!createdJobId) return;

    const res = http.del(`${BASE_URL}/api/v1/jobs/${createdJobId}`, null, { headers });

    const ok = check(res, {
      'delete: status 200': (r) => r.status === 200,
    });
    deleteJobSuccess.add(ok);
  });

  sleep(0.5);
}
