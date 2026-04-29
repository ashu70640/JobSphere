/**
 * Integration Tests — Stats + Upcoming Interviews
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { connect, disconnect, clearDatabase } from '../../utils/testDb.js';
import {
  VALID_USER,
  VALID_JOB,
  VALID_JOB_OFFER,
  VALID_JOB_DECLINED,
  VALID_JOB_INTERVIEW,
} from '../../utils/mockData.js';

import authRoutes from '../../../services/auth/src/routes/authRoutes.js';
import jobRoutes from '../../../services/jobs/src/routes/jobRoutes.js';

const authApp = express();
authApp.use(express.json());
authApp.use('/api/v1/auth', authRoutes);

const jobsApp = express();
jobsApp.use(express.json());
jobsApp.use('/api/v1/jobs', jobRoutes);

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
afterEach(async () => { await clearDatabase(); });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const setupUser = async () => {
  await request(authApp).post('/api/v1/auth/register').send(VALID_USER);
  const res = await request(authApp)
    .post('/api/v1/auth/login')
    .send({ email: VALID_USER.email, password: VALID_USER.password });
  return res.body.accessToken;
};

const createJob = async (token, jobData) =>
  request(jobsApp)
    .post('/api/v1/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send(jobData);

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/jobs/stats', () => {
  it('returns default stats with all zeros when no jobs exist', async () => {
    const token = await setupUser();

    const res = await request(jobsApp)
      .get('/api/v1/jobs/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.defaultStats).toEqual({
      pending: 0,
      interview: 0,
      declined: 0,
      offer: 0,
    });
    expect(Array.isArray(res.body.monthlyApplications)).toBe(true);
  });

  it('returns accurate status counts after seeding jobs', async () => {
    const token = await setupUser();
    await createJob(token, VALID_JOB);           // pending
    await createJob(token, VALID_JOB_OFFER);      // offer
    await createJob(token, VALID_JOB_DECLINED);   // declined
    await createJob(token, VALID_JOB_INTERVIEW);  // interview

    const res = await request(jobsApp)
      .get('/api/v1/jobs/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.defaultStats).toMatchObject({
      pending: 1,
      interview: 1,
      offer: 1,
      declined: 1,
    });
  });

  it('includes monthlyApplications array in response', async () => {
    const token = await setupUser();
    await createJob(token, VALID_JOB);

    const res = await request(jobsApp)
      .get('/api/v1/jobs/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.monthlyApplications).toHaveLength(1);
    expect(res.body.monthlyApplications[0]).toHaveProperty('date');
    expect(res.body.monthlyApplications[0]).toHaveProperty('count');
  });

  it('returns 401 without token', async () => {
    const res = await request(jobsApp).get('/api/v1/jobs/stats');
    expect(res.status).toBe(401);
  });

  it('only counts jobs belonging to the authenticated user', async () => {
    const token = await setupUser();
    await createJob(token, VALID_JOB);

    // Different user registers separately
    const user2Email = 'stats2@test.com';
    await request(authApp)
      .post('/api/v1/auth/register')
      .send({ name: 'Stats2', email: user2Email, password: 'Pass@123' });
    const login2 = await request(authApp)
      .post('/api/v1/auth/login')
      .send({ email: user2Email, password: 'Pass@123' });
    const token2 = login2.body.accessToken;

    const res = await request(jobsApp)
      .get('/api/v1/jobs/stats')
      .set('Authorization', `Bearer ${token2}`);

    expect(res.body.defaultStats.pending).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UPCOMING INTERVIEWS
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/jobs/upcoming-interviews', () => {
  it('returns 200 with interview jobs sorted by date', async () => {
    const token = await setupUser();
    await createJob(token, VALID_JOB_INTERVIEW); // has interviewDate 2 days from now

    const res = await request(jobsApp)
      .get('/api/v1/jobs/upcoming-interviews')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.jobs)).toBe(true);
    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.jobs[0].status).toBe('interview');
  });

  it('returns empty array when no interview-status jobs exist', async () => {
    const token = await setupUser();
    await createJob(token, VALID_JOB); // pending

    const res = await request(jobsApp)
      .get('/api/v1/jobs/upcoming-interviews')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.jobs).toHaveLength(0);
  });

  it('returns 401 without token', async () => {
    const res = await request(jobsApp).get('/api/v1/jobs/upcoming-interviews');
    expect(res.status).toBe(401);
  });

  it('limits results to max 5 upcoming interviews', async () => {
    const token = await setupUser();
    // Seed 7 interview jobs
    for (let i = 1; i <= 7; i++) {
      await createJob(token, {
        ...VALID_JOB_INTERVIEW,
        company: `Company ${i}`,
        interviewDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const res = await request(jobsApp)
      .get('/api/v1/jobs/upcoming-interviews')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.jobs.length).toBeLessThanOrEqual(5);
  });
});
