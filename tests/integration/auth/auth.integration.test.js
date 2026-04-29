/**
 * Integration Tests — Auth Service
 * Uses Supertest with a dedicated test Express app that wires the actual
 * auth routes + controllers against an in-memory MongoDB instance.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { connect, disconnect, clearDatabase } from '../../utils/testDb.js';
import { VALID_USER, VALID_USER_2 } from '../../utils/mockData.js';
import { generateAccessToken, generateExpiredToken } from '../../utils/tokenHelper.js';

// Import actual routes (they will use the mongoose connection set up above)
import authRoutes from '../../../services/auth/src/routes/authRoutes.js';

// ─── Test app ─────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

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

// ─── Helper: register + login a user ─────────────────────────────────────────

const registerAndLogin = async (userData = VALID_USER) => {
  await request(app).post('/api/v1/auth/register').send(userData);
  const res = await request(app).post('/api/v1/auth/login').send({
    email: userData.email,
    password: userData.password,
  });
  return res.body; // { accessToken, refreshToken, user }
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('registers a new user and returns 201 with token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(VALID_USER);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('message', 'User registered successfully');
    expect(res.body.user).toMatchObject({ name: VALID_USER.name, email: VALID_USER.email });
    // Password must never appear in response
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('returns 400 when the email is already registered', async () => {
    await request(app).post('/api/v1/auth/register').send(VALID_USER);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(VALID_USER);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'User Already Exist');
  });

  it('returns 500 when required fields are absent (mongoose validation)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'missing-name@test.com', password: 'pass' });

    // Mongoose validation fires before controller creates user
    expect([400, 500]).toContain(res.status);
  });

  it('allows two different users to register with different emails', async () => {
    const r1 = await request(app)
      .post('/api/v1/auth/register')
      .send(VALID_USER);
    const r2 = await request(app)
      .post('/api/v1/auth/register')
      .send(VALID_USER_2);

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send(VALID_USER);
  });

  it('returns 200 with accessToken, refreshToken, and user on valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toMatchObject({
      name: VALID_USER.name,
      email: VALID_USER.email,
    });
  });

  it('returns 400 when email does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@nowhere.com', password: 'pass' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Invalid Credentials');
  });

  it('returns 400 when password is incorrect', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: 'WrongPassword!' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Invalid Credentials');
  });

  it('access token expires in 15 minutes (JWT exp claim check)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    const [, payload] = res.body.accessToken.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const expiresInSeconds = decoded.exp - decoded.iat;
    expect(expiresInSeconds).toBeLessThanOrEqual(900); // 15 min = 900s
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /me — Protected route
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  it('returns 200 with user data when valid token is sent', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toMatchObject({ email: VALID_USER.email });
    expect(res.body).toHaveProperty('source', 'db');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
  });

  it('returns 401 when token is expired', async () => {
    await registerAndLogin();
    const expiredToken = generateExpiredToken('fake-uid');

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it('returns 401 when token is malformed', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
  });

  it('does not expose hashed password in response', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.body.user).not.toHaveProperty('password');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /updateUser
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/v1/auth/updateUser', () => {
  it('updates name, email, and location; returns 200', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .patch('/api/v1/auth/updateUser')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Alice', email: 'updated@test.com', location: 'LA' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      name: 'Updated Alice',
      email: 'updated@test.com',
      location: 'LA',
    });
  });

  it('returns 400 when name is missing', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .patch('/api/v1/auth/updateUser')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'e@t.com' }); // no name

    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/updateUser')
      .send({ name: 'X', email: 'x@t.com' });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /refresh
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  it('returns a new accessToken when refresh token is valid', async () => {
    const { refreshToken } = await registerAndLogin();

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('returns 401 when refresh token is not provided', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({});

    expect(res.status).toBe(401);
  });

  it('returns 403 when refresh token is invalid/expired', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'completely-made-up-token-string-that-does-not-exist' });

    expect(res.status).toBe(403);
  });
});
