/**
 * Integration Tests — AI Endpoints
 * Gemini is mocked via vi.stubGlobal('fetch') so no real API calls are made.
 * Tests cover: summarize, match-resume, match-resume-pdf, and rate limiting.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { connect, disconnect, clearDatabase } from '../../utils/testDb.js';
import {
  VALID_USER,
  VALID_JOB,
  VALID_RESUME_TEXT,
  GEMINI_SUMMARIZE_RAW_RESPONSE,
  GEMINI_MATCH_RAW_RESPONSE,
} from '../../utils/mockData.js';

import authRoutes from '../../../services/auth/src/routes/authRoutes.js';
import jobRoutes from '../../../services/jobs/src/routes/jobRoutes.js';

const authApp = express();
authApp.use(express.json());
authApp.use('/api/v1/auth', authRoutes);

const jobsApp = express();
jobsApp.use(express.json());
jobsApp.use('/api/v1/jobs', jobRoutes);

// ─── Mock global fetch (used by jobController for Gemini API) ─────────────────

const mockFetchSuccess = (responseBody) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(responseBody),
      text: vi.fn().mockResolvedValue(''),
    }),
  );

const mockFetchFailure = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Gemini API Error: quota exceeded'),
    }),
  );

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
afterEach(async () => {
  await clearDatabase();
  vi.unstubAllGlobals();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const setupUser = async (userData = VALID_USER) => {
  await request(authApp).post('/api/v1/auth/register').send(userData);
  const res = await request(authApp)
    .post('/api/v1/auth/login')
    .send({ email: userData.email, password: userData.password });
  return res.body.accessToken;
};

const createJob = async (token, jobData = VALID_JOB) => {
  const res = await request(jobsApp)
    .post('/api/v1/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send(jobData);
  return res.body.job._id;
};

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARIZE JOB
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/jobs/:id/summarize', () => {
  it('returns 200 with structured summary from Gemini', async () => {
    mockFetchSuccess(GEMINI_SUMMARIZE_RAW_RESPONSE);

    const token = await setupUser();
    const jobId = await createJob(token);

    const res = await request(jobsApp)
      .post(`/api/v1/jobs/${jobId}/summarize`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary).toHaveProperty('keySkills');
    expect(res.body.summary).toHaveProperty('responsibilities');
    expect(res.body.summary).toHaveProperty('experience');
    expect(res.body.summary).toHaveProperty('techStack');
    expect(Array.isArray(res.body.summary.keySkills)).toBe(true);
  });

  it('returns 404 when job does not exist', async () => {
    mockFetchSuccess(GEMINI_SUMMARIZE_RAW_RESPONSE);

    const token = await setupUser();

    const res = await request(jobsApp)
      .post('/api/v1/jobs/000000000000000000000099/summarize')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 500 when Gemini API fails', async () => {
    mockFetchFailure();

    const token = await setupUser();
    const jobId = await createJob(token);

    const res = await request(jobsApp)
      .post(`/api/v1/jobs/${jobId}/summarize`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(jobsApp).post('/api/v1/jobs/someid/summarize');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MATCH RESUME (TEXT)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/jobs/:id/match-resume', () => {
  it('returns 200 with matchScore and analysis', async () => {
    mockFetchSuccess(GEMINI_MATCH_RAW_RESPONSE);

    const token = await setupUser();
    const jobId = await createJob(token);

    const res = await request(jobsApp)
      .post(`/api/v1/jobs/${jobId}/match-resume`)
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeText: VALID_RESUME_TEXT });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('result');
    expect(res.body.result).toHaveProperty('matchScore');
    expect(typeof res.body.result.matchScore).toBe('number');
    expect(res.body.result).toHaveProperty('missingSkills');
    expect(res.body.result).toHaveProperty('strengthAreas');
    expect(res.body.result).toHaveProperty('improvementSuggestions');
  });

  it('returns 400 when resumeText is not provided', async () => {
    const token = await setupUser();
    const jobId = await createJob(token);

    const res = await request(jobsApp)
      .post(`/api/v1/jobs/${jobId}/match-resume`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Resume text is required');
  });

  it('returns 400 when resumeText is whitespace only', async () => {
    const token = await setupUser();
    const jobId = await createJob(token);

    const res = await request(jobsApp)
      .post(`/api/v1/jobs/${jobId}/match-resume`)
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeText: '    ' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when job is not found', async () => {
    mockFetchSuccess(GEMINI_MATCH_RAW_RESPONSE);
    const token = await setupUser();

    const res = await request(jobsApp)
      .post('/api/v1/jobs/000000000000000000000099/match-resume')
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeText: VALID_RESUME_TEXT });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MATCH RESUME PDF
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/jobs/:id/match-resume-pdf', () => {
  it('returns 400 when no file is uploaded', async () => {
    const token = await setupUser();
    const jobId = await createJob(token);

    const res = await request(jobsApp)
      .post(`/api/v1/jobs/${jobId}/match-resume-pdf`)
      .set('Authorization', `Bearer ${token}`);
    // No file attached

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'PDF file required');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(jobsApp).post('/api/v1/jobs/id/match-resume-pdf');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AI RATE LIMITING — 20 requests/day
// ─────────────────────────────────────────────────────────────────────────────

describe('AI Rate Limit — 20 requests/day per user', () => {
  it('allows up to 20 requests then blocks the 21st with 429', async () => {
    mockFetchSuccess(GEMINI_SUMMARIZE_RAW_RESPONSE);

    const token = await setupUser();
    const jobId = await createJob(token);

    // Make 20 successful requests
    for (let i = 0; i < 20; i++) {
      const res = await request(jobsApp)
        .post(`/api/v1/jobs/${jobId}/summarize`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    }

    // 21st request must be blocked
    const blockedRes = await request(jobsApp)
      .post(`/api/v1/jobs/${jobId}/summarize`)
      .set('Authorization', `Bearer ${token}`);

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body).toHaveProperty('message', 'Daily AI limit exceeded (20/day)');
  }, 60000); // allow extra time for 20 requests

  it('rate limit is per-user — a second user is not affected', async () => {
    mockFetchSuccess(GEMINI_SUMMARIZE_RAW_RESPONSE);

    // Register two users
    const token1 = await setupUser();
    const jobId1 = await createJob(token1);

    await request(authApp)
      .post('/api/v1/auth/register')
      .send({ name: 'User2', email: 'user2rate@test.com', password: 'Pass@123' });
    const login2 = await request(authApp)
      .post('/api/v1/auth/login')
      .send({ email: 'user2rate@test.com', password: 'Pass@123' });
    const token2 = login2.body.accessToken;
    const jobId2 = await createJob(token2);

    // Exhaust user1's quota
    for (let i = 0; i < 20; i++) {
      await request(jobsApp)
        .post(`/api/v1/jobs/${jobId1}/summarize`)
        .set('Authorization', `Bearer ${token1}`);
    }

    // User 2 must still succeed
    const res = await request(jobsApp)
      .post(`/api/v1/jobs/${jobId2}/summarize`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(200);
  }, 60000);
});
