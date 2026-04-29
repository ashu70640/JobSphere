/**
 * Integration Tests — Jobs Service CRUD + Filters + Pagination
 * Test app wires actual job routes + controllers against in-memory MongoDB.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { connect, disconnect, clearDatabase } from '../../utils/testDb.js';
import { VALID_USER, VALID_JOB, VALID_JOB_2, VALID_JOB_INTERVIEW } from '../../utils/mockData.js';

import authRoutesAuth from '../../../services/auth/src/routes/authRoutes.js';
import jobRoutes from '../../../services/jobs/src/routes/jobRoutes.js';

// ─── Test apps ────────────────────────────────────────────────────────────────
// Auth app — only used to register/login and get tokens
const authApp = express();
authApp.use(express.json());
authApp.use('/api/v1/auth', authRoutesAuth);

// Jobs app — the system under test
const jobsApp = express();
jobsApp.use(express.json());
jobsApp.use('/api/v1/jobs', jobRoutes);

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await connect();
});

afterAll(async () => {
  await disconnect();
});

afterEach(async () => {
  await clearDatabase();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const setupUser = async (userData = VALID_USER) => {
  await request(authApp).post('/api/v1/auth/register').send(userData);
  const res = await request(authApp)
    .post('/api/v1/auth/login')
    .send({ email: userData.email, password: userData.password });
  return { token: res.body.accessToken, userId: res.body.user.userId };
};

const createJobFor = async (token, jobData = VALID_JOB) =>
  request(jobsApp)
    .post('/api/v1/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send(jobData);

// ─────────────────────────────────────────────────────────────────────────────
// CREATE JOB
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/jobs', () => {
  it('creates a job and returns 201 with the job object', async () => {
    const { token } = await setupUser();
    const res = await createJobFor(token);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('job');
    expect(res.body.job).toMatchObject({
      company: VALID_JOB.company,
      position: VALID_JOB.position,
      status: 'pending',
    });
    expect(res.body.job).toHaveProperty('_id');
    expect(res.body.job).toHaveProperty('createdBy');
  });

  it('returns 400 when company is missing', async () => {
    const { token } = await setupUser();
    const res = await request(jobsApp)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ position: 'Dev', workLocation: 'NY', description: 'desc' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'All fields are required');
  });

  it('returns 400 when position is missing', async () => {
    const { token } = await setupUser();
    const res = await request(jobsApp)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ company: 'TechCorp', workLocation: 'NY', description: 'desc' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(jobsApp).post('/api/v1/jobs').send(VALID_JOB);

    expect(res.status).toBe(401);
  });

  it('creates a job with interview fields when status is interview', async () => {
    const { token } = await setupUser();
    const res = await createJobFor(token, VALID_JOB_INTERVIEW);

    expect(res.status).toBe(201);
    expect(res.body.job).toMatchObject({
      status: 'interview',
      interviewType: 'video',
      interviewRound: 1,
      interviewerName: 'Jane Smith',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL JOBS
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/jobs', () => {
  let token;

  beforeEach(async () => {
    const user = await setupUser();
    token = user.token;
    // Seed 3 jobs
    await createJobFor(token, VALID_JOB);
    await createJobFor(token, VALID_JOB_2);
    await createJobFor(token, VALID_JOB_INTERVIEW);
  });

  it('returns all jobs for the authenticated user', async () => {
    const res = await request(jobsApp)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalJobs).toBe(3);
    expect(Array.isArray(res.body.jobs)).toBe(true);
    expect(res.body).toHaveProperty('numOfPages');
    expect(res.body).toHaveProperty('currentPage');
  });

  it('filters jobs by status=interview', async () => {
    const res = await request(jobsApp)
      .get('/api/v1/jobs?status=interview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalJobs).toBe(1);
    expect(res.body.jobs[0].status).toBe('interview');
  });

  it('filters jobs by jobType=remote', async () => {
    const res = await request(jobsApp)
      .get('/api/v1/jobs?jobType=remote')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.jobs.every((j) => j.jobType === 'remote')).toBe(true);
  });

  it('searches jobs by company name (case-insensitive)', async () => {
    const res = await request(jobsApp)
      .get('/api/v1/jobs?search=techcorp')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.jobs.some((j) => j.company === 'TechCorp')).toBe(true);
  });

  it('searches jobs by position name', async () => {
    const res = await request(jobsApp)
      .get('/api/v1/jobs?search=backend')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.jobs.length).toBeGreaterThan(0);
  });

  it('paginates results — page 1 with limit 2 returns 2 jobs', async () => {
    const res = await request(jobsApp)
      .get('/api/v1/jobs?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.jobs).toHaveLength(2);
    expect(res.body.numOfPages).toBe(2); // ceil(3/2) = 2
  });

  it('paginates results — page 2 with limit 2 returns 1 job', async () => {
    const res = await request(jobsApp)
      .get('/api/v1/jobs?page=2&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.jobs).toHaveLength(1);
  });

  it('sorts jobs a-z by position', async () => {
    const res = await request(jobsApp)
      .get('/api/v1/jobs?sort=a-z')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const positions = res.body.jobs.map((j) => j.position);
    const sorted = [...positions].sort((a, b) => a.localeCompare(b));
    expect(positions).toEqual(sorted);
  });

  it('returns 0 jobs when status=offer and none exist', async () => {
    const res = await request(jobsApp)
      .get('/api/v1/jobs?status=offer')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalJobs).toBe(0);
  });

  it('does NOT return jobs belonging to another user', async () => {
    const user2 = await setupUser(VALID_USER_2);
    const res = await request(jobsApp)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${user2.token}`);

    expect(res.body.totalJobs).toBe(0);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(jobsApp).get('/api/v1/jobs');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE JOB
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/jobs/:id', () => {
  it('returns 200 with the job', async () => {
    const { token } = await setupUser();
    const created = await createJobFor(token);
    const jobId = created.body.job._id;

    const res = await request(jobsApp)
      .get(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.job._id).toBe(jobId);
  });

  it('returns 404 for a non-existent job ID', async () => {
    const { token } = await setupUser();
    const res = await request(jobsApp)
      .get('/api/v1/jobs/000000000000000000000099')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 404 when job belongs to another user', async () => {
    const user1 = await setupUser();
    const user2 = await setupUser(VALID_USER_2);
    const created = await createJobFor(user1.token);
    const jobId = created.body.job._id;

    const res = await request(jobsApp)
      .get(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${user2.token}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE JOB
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/v1/jobs/:id', () => {
  it('updates job status and returns 200', async () => {
    const { token } = await setupUser();
    const created = await createJobFor(token);
    const jobId = created.body.job._id;

    const res = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'interview', interviewType: 'phone' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('interview');
    expect(res.body.interviewType).toBe('phone');
  });

  it('returns 404 for job belonging to another user', async () => {
    const user1 = await setupUser();
    const user2 = await setupUser(VALID_USER_2);
    const created = await createJobFor(user1.token);
    const jobId = created.body.job._id;

    const res = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${user2.token}`)
      .send({ status: 'offer' });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE JOB
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/v1/jobs/:id', () => {
  it('deletes the job and returns 200', async () => {
    const { token } = await setupUser();
    const created = await createJobFor(token);
    const jobId = created.body.job._id;

    const res = await request(jobsApp)
      .delete(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Job deleted successfully');

    // Verify it's gone
    const check = await request(jobsApp)
      .get(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(check.status).toBe(404);
  });

  it('returns 404 when deleting non-existent job', async () => {
    const { token } = await setupUser();
    const res = await request(jobsApp)
      .delete('/api/v1/jobs/000000000000000000000099')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
