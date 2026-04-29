/**
 * Unit Tests — Auth Controller
 * All DB and JWT calls are fully mocked.
 * We exercise the controller functions directly with fake req/res objects.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock dependencies before importing the controller ───────────────────────

vi.mock('../../../services/auth/src/models/User.js', () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mock.jwt.token'),
    verify: vi.fn(),
  },
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({ toString: () => 'mock-refresh-token-40bytes' })),
  },
}));

// ─── Import after mocking ─────────────────────────────────────────────────────

import User from '../../../services/auth/src/models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  register,
  login,
  getCurrentUser,
  updateUser,
  refreshAccessToken,
} from '../../../services/auth/src/controllers/authController.js';

// ─── Helper: build fake req/res ───────────────────────────────────────────────

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = (body = {}, params = {}, user = {}) => ({
  body,
  params,
  user,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Auth Controller — register()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a user and returns 201 with token', async () => {
    User.findOne.mockResolvedValue(null); // no existing user
    bcrypt.hash.mockResolvedValue('hashed-password');
    const fakeUser = {
      _id: 'user-id-123',
      name: 'Alice',
      email: 'alice@test.com',
    };
    User.create.mockResolvedValue(fakeUser);

    const req = mockReq({ name: 'Alice', email: 'alice@test.com', password: 'pass' });
    const res = mockRes();

    await register(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'alice@test.com' });
    expect(bcrypt.hash).toHaveBeenCalledWith('pass', 8);
    expect(User.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User registered successfully',
        token: 'mock.jwt.token',
        user: fakeUser,
      }),
    );
  });

  it('returns 400 when user already exists', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing', email: 'dup@test.com' });

    const req = mockReq({ name: 'Dup', email: 'dup@test.com', password: 'pass' });
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'User Already Exist' });
    expect(User.create).not.toHaveBeenCalled();
  });

  it('returns 500 on unexpected error', async () => {
    User.findOne.mockRejectedValue(new Error('DB down'));

    const req = mockReq({ name: 'A', email: 'a@t.com', password: 'p' });
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Server Error' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Auth Controller — login()', () => {
  beforeEach(() => vi.clearAllMocks());

  const makeFakeUser = () => ({
    _id: 'uid-001',
    name: 'Alice',
    email: 'alice@test.com',
    password: 'hashed-pass',
    location: 'NY',
    refreshTokens: [],
    save: vi.fn().mockResolvedValue(true),
  });

  it('returns 200 with accessToken, refreshToken, and user on success', async () => {
    const fakeUser = makeFakeUser();
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);

    const req = mockReq({ email: 'alice@test.com', password: 'pass' });
    const res = mockRes();

    await login(req, res);

    expect(fakeUser.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(body.user).toMatchObject({ name: 'Alice', email: 'alice@test.com' });
  });

  it('returns 400 when user is not found', async () => {
    User.findOne.mockResolvedValue(null);

    const req = mockReq({ email: 'ghost@test.com', password: 'pass' });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid Credentials' });
  });

  it('returns 400 when password does not match', async () => {
    User.findOne.mockResolvedValue(makeFakeUser());
    bcrypt.compare.mockResolvedValue(false);

    const req = mockReq({ email: 'alice@test.com', password: 'wrong-pass' });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid Credentials' });
  });

  it('returns 500 on unexpected error', async () => {
    User.findOne.mockRejectedValue(new Error('DB crash'));

    const req = mockReq({ email: 'alice@test.com', password: 'pass' });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Auth Controller — getCurrentUser()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with user and source="db"', async () => {
    const fakeUser = { _id: 'uid-001', name: 'Alice', email: 'alice@test.com' };
    User.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(fakeUser),
    });

    const req = mockReq({}, {}, { userId: 'uid-001' });
    const res = mockRes();

    await getCurrentUser(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: fakeUser, source: 'db' });
  });

  it('returns 404 when user does not exist in DB', async () => {
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

    const req = mockReq({}, {}, { userId: 'uid-missing' });
    const res = mockRes();

    await getCurrentUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ msg: 'User not found' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Auth Controller — updateUser()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates and returns 200 with updated user', async () => {
    const fakeUser = {
      _id: 'uid-001',
      name: 'Old Name',
      email: 'old@test.com',
      location: 'NY',
      save: vi.fn().mockResolvedValue(true),
    };
    User.findById.mockResolvedValue(fakeUser);

    const req = mockReq(
      { name: 'New Name', email: 'new@test.com', location: 'LA' },
      {},
      { userId: 'uid-001' },
    );
    const res = mockRes();

    await updateUser(req, res);

    expect(fakeUser.name).toBe('New Name');
    expect(fakeUser.email).toBe('new@test.com');
    expect(fakeUser.location).toBe('LA');
    expect(fakeUser.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 when name or email is missing', async () => {
    const req = mockReq({ name: '', email: '' }, {}, { userId: 'uid-001' });
    const res = mockRes();

    await updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when user does not exist', async () => {
    User.findById.mockResolvedValue(null);

    const req = mockReq(
      { name: 'Name', email: 'e@t.com' },
      {},
      { userId: 'uid-missing' },
    );
    const res = mockRes();

    await updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Auth Controller — refreshAccessToken()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns new accessToken when refresh token is valid', async () => {
    const fakeUser = { _id: 'uid-001' };
    User.findOne.mockResolvedValue(fakeUser);

    const req = mockReq({ refreshToken: 'valid-refresh-token' });
    const res = mockRes();

    await refreshAccessToken(req, res);

    expect(res.json).toHaveBeenCalledWith({ accessToken: 'mock.jwt.token' });
  });

  it('returns 401 when no refresh token provided', async () => {
    const req = mockReq({});
    const res = mockRes();

    await refreshAccessToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Refresh token required' });
  });

  it('returns 403 when refresh token is not found in DB', async () => {
    User.findOne.mockResolvedValue(null);

    const req = mockReq({ refreshToken: 'unknown-token' });
    const res = mockRes();

    await refreshAccessToken(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid refresh token' });
  });
});
