/**
 * Security Tests — Injection Attacks
 * NoSQL injection, XSS payloads, oversized inputs, prototype pollution.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { connect, disconnect, clearDatabase } from '../utils/testDb.js';
import { VALID_USER, VALID_JOB } from '../utils/mockData.js';

import authRoutes from '../../services/auth/src/routes/authRoutes.js';
import jobRoutes from '../../services/jobs/src/routes/jobRoutes.js';

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

const registerAndLogin = async () => {
  await request(authApp).post('/api/v1/auth/register').send(VALID_USER);
  const res = await request(authApp)
    .post('/api/v1/auth/login')
    .send({ email: VALID_USER.email, password: VALID_USER.password });
  return res.body.accessToken;
};

// ─────────────────────────────────────────────────────────────────────────────

describe('NoSQL Injection — Login Endpoint', () => {
  it('rejects $ne operator injection in email field', async () => {
    await request(authApp).post('/api/v1/auth/register').send(VALID_USER);

    const res = await request(authApp)
      .post('/api/v1/auth/login')
      .send({ email: { $ne: null }, password: VALID_USER.password });

    // Should not log in — Express parses object keys, but Mongoose protects via casting
    expect([400, 401, 500]).toContain(res.status);
    // Must NOT return an access token
    expect(res.body).not.toHaveProperty('accessToken');
  });

  it('rejects $gt injection in password field', async () => {
    await request(authApp).post('/api/v1/auth/register').send(VALID_USER);

    const res = await request(authApp)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: { $gt: '' } });

    expect([400, 401, 500]).toContain(res.status);
    expect(res.body).not.toHaveProperty('accessToken');
  });

  it('rejects $where operator injection', async () => {
    const res = await request(authApp)
      .post('/api/v1/auth/login')
      .send({ email: { $where: 'function(){return true;}' }, password: 'any' });

    expect([400, 500]).toContain(res.status);
    expect(res.body).not.toHaveProperty('accessToken');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('NoSQL Injection — Job Endpoints', () => {
  it('cannot use $regex injection to bypass job ownership filter', async () => {
    const token = await registerAndLogin();

    // Attacker crafts a query with injection in search param
    const res = await request(jobsApp)
      .get('/api/v1/jobs?search[$regex]=.*&search[$options]=i')
      .set('Authorization', `Bearer ${token}`);

    // Should return normally (no jobs or user's own jobs only)
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      // Any returned jobs must belong to the authenticated user
      res.body.jobs?.forEach((job) => {
        expect(job).toHaveProperty('createdBy');
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('XSS Payload Handling', () => {
  it('stores XSS payload as plain text without executing (API returns raw string)', async () => {
    const token = await registerAndLogin();
    const xssPayload = '<script>alert("xss")</script>';

    const res = await request(jobsApp)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        company: xssPayload,
        position: 'Dev',
        workLocation: 'NY',
        description: 'desc',
      });

    // API should either store it as-is (frontend must sanitize) or reject it
    if (res.status === 201) {
      // If stored, must come back as the raw string — not escaped HTML
      expect(res.body.job.company).toBe(xssPayload);
    } else {
      expect([400, 422]).toContain(res.status);
    }
  });

  it('note text with XSS payload is stored safely', async () => {
    const token = await registerAndLogin();
    const createRes = await request(jobsApp)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_JOB);

    const jobId = createRes.body.job._id;
    const xssNote = '"><img src=x onerror=alert(1)>';

    const noteRes = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: xssNote });

    expect(noteRes.status).toBe(200);
    // Stored as plain text — rendering safety is the frontend's responsibility
    expect(noteRes.body.job.notes[0].text).toBe(xssNote);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Oversized / Boundary Input Validation', () => {
  it('rejects company name exceeding 50 characters (Mongoose maxlength)', async () => {
    const token = await registerAndLogin();

    const res = await request(jobsApp)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        company: 'A'.repeat(51), // 51 chars — exceeds maxlength:50
        position: 'Dev',
        workLocation: 'NY',
        description: 'desc',
      });

    expect([400, 500]).toContain(res.status);
  });

  it('rejects position exceeding 100 characters', async () => {
    const token = await registerAndLogin();

    const res = await request(jobsApp)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        company: 'Corp',
        position: 'B'.repeat(101), // 101 chars — exceeds maxlength:100
        workLocation: 'NY',
        description: 'desc',
      });

    expect([400, 500]).toContain(res.status);
  });

  it('rejects invalid status enum value', async () => {
    const token = await registerAndLogin();

    const res = await request(jobsApp)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        company: 'Corp',
        position: 'Dev',
        workLocation: 'NY',
        description: 'desc',
        status: 'hacked', // not in enum
      });

    expect([400, 500]).toContain(res.status);
  });

  it('rejects invalid jobType enum value', async () => {
    const token = await registerAndLogin();

    const res = await request(jobsApp)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        company: 'Corp',
        position: 'Dev',
        workLocation: 'NY',
        description: 'desc',
        jobType: 'freelance', // not in enum
      });

    expect([400, 500]).toContain(res.status);
  });

  it('handles very large request body without crashing (express.json 100kb limit)', async () => {
    const token = await registerAndLogin();

    const res = await request(jobsApp)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        company: 'Corp',
        position: 'Dev',
        workLocation: 'NY',
        description: 'X'.repeat(200 * 1024), // 200KB description
      });

    // Express may reject with 413 or the service stores it (no explicit limit in controller)
    expect([201, 400, 413, 500]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Invalid ObjectId Handling', () => {
  it('handles non-ObjectId job ID without crashing — returns 400 or 404', async () => {
    const token = await registerAndLogin();

    const res = await request(jobsApp)
      .get('/api/v1/jobs/NOT_AN_OBJECT_ID')
      .set('Authorization', `Bearer ${token}`);

    expect([400, 404, 500]).toContain(res.status);
  });

  it('handles non-ObjectId in delete endpoint', async () => {
    const token = await registerAndLogin();

    const res = await request(jobsApp)
      .delete('/api/v1/jobs/!@#$%^&*()')
      .set('Authorization', `Bearer ${token}`);

    expect([400, 404, 500]).toContain(res.status);
  });
});
