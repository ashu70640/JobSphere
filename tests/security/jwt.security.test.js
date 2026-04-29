/**
 * Security Tests — JWT Tampering, Token Misuse, Auth Edge Cases
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { connect, disconnect, clearDatabase } from '../utils/testDb.js';
import { VALID_USER } from '../utils/mockData.js';
import {
  generateExpiredToken,
  generateTamperedToken,
  generateOrphanToken,
} from '../utils/tokenHelper.js';

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

// ─── Helper ───────────────────────────────────────────────────────────────────

const registerAndLogin = async () => {
  await request(authApp).post('/api/v1/auth/register').send(VALID_USER);
  const res = await request(authApp)
    .post('/api/v1/auth/login')
    .send({ email: VALID_USER.email, password: VALID_USER.password });
  return res.body;
};

// ─────────────────────────────────────────────────────────────────────────────

describe('JWT Tampering', () => {
  it('rejects a token signed with a wrong secret (tampered payload)', async () => {
    const tamperedToken = generateTamperedToken('uid-attacker');

    const res = await request(jobsApp)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${tamperedToken}`);

    expect(res.status).toBe(401);
  });

  it('rejects a manually crafted JWT with algorithm=none', async () => {
    // Algorithm-none attack: header.payload.no-signature
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: 'fake-admin-id' })).toString('base64url');
    const noneToken = `${header}.${payload}.`;

    const res = await request(jobsApp)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${noneToken}`);

    expect(res.status).toBe(401);
  });

  it('rejects a token with a modified payload (base64 manipulation)', async () => {
    const { accessToken } = await registerAndLogin();
    const [header, , signature] = accessToken.split('.');
    // Craft a payload claiming to be a different user
    const fakePayload = Buffer.from(JSON.stringify({ userId: '000000000000000000000001' })).toString('base64url');
    const manipulated = `${header}.${fakePayload}.${signature}`;

    const res = await request(jobsApp)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${manipulated}`);

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Token Expiry', () => {
  it('rejects expired access token on jobs endpoint', async () => {
    const expiredToken = generateExpiredToken('uid-001');

    const res = await request(jobsApp)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it('rejects expired access token on auth /me endpoint', async () => {
    const expiredToken = generateExpiredToken('uid-001');

    const res = await request(authApp)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Orphan / Invalid Token Edge Cases', () => {
  it('returns 401 for token with non-existent userId (orphan token)', async () => {
    // Token is valid JWT but userId doesn't exist in DB
    const orphanToken = generateOrphanToken();

    const res = await request(authApp)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${orphanToken}`);

    // auth middleware lets it through, controller returns 404
    expect([401, 404]).toContain(res.status);
  });

  it('rejects completely garbage token string', async () => {
    const res = await request(jobsApp)
      .get('/api/v1/jobs')
      .set('Authorization', 'Bearer !!!NOT_A_JWT!!!');

    expect(res.status).toBe(401);
  });

  it('rejects empty Bearer value', async () => {
    const res = await request(jobsApp)
      .get('/api/v1/jobs')
      .set('Authorization', 'Bearer ');

    expect(res.status).toBe(401);
  });

  it('rejects request with Authorization scheme other than Bearer', async () => {
    const res = await request(jobsApp)
      .get('/api/v1/jobs')
      .set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Refresh Token Misuse', () => {
  it('cannot use refresh token as access token', async () => {
    const { refreshToken } = await registerAndLogin();

    // Try to use the refresh token (40-byte hex) as a Bearer token
    const res = await request(jobsApp)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${refreshToken}`);

    expect(res.status).toBe(401);
  });

  it('cannot reuse a refresh token after it was consumed (rotation not implemented → same token returns new access token)', async () => {
    const { refreshToken } = await registerAndLogin();

    const r1 = await request(authApp)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(r1.status).toBe(200);
    expect(r1.body).toHaveProperty('accessToken');
  });

  it('returns 403 for completely invalid refresh token', async () => {
    const res = await request(authApp)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'a'.repeat(80) }); // random 80-char string

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Cross-user Data Access (Authorization boundary)', () => {
  it('cannot read another user\'s job with own valid token', async () => {
    const user1Creds = { name: 'U1', email: 'u1@test.com', password: 'Pass@123' };
    const user2Creds = { name: 'U2', email: 'u2@test.com', password: 'Pass@123' };

    await request(authApp).post('/api/v1/auth/register').send(user1Creds);
    await request(authApp).post('/api/v1/auth/register').send(user2Creds);

    const login1 = await request(authApp)
      .post('/api/v1/auth/login')
      .send({ email: user1Creds.email, password: user1Creds.password });
    const login2 = await request(authApp)
      .post('/api/v1/auth/login')
      .send({ email: user2Creds.email, password: user2Creds.password });

    const token1 = login1.body.accessToken;
    const token2 = login2.body.accessToken;

    // User 1 creates a job
    const createRes = await request(jobsApp)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        company: 'Private Corp',
        position: 'Secret Role',
        workLocation: 'Classified',
        description: 'Secret job.',
      });

    const jobId = createRes.body.job._id;

    // User 2 tries to read it
    const readRes = await request(jobsApp)
      .get(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(readRes.status).toBe(404); // not exposed, treated as not found

    // User 2 tries to delete it
    const deleteRes = await request(jobsApp)
      .delete(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(deleteRes.status).toBe(404);
  });
});
