/**
 * Unit Tests — Auth Middleware (Jobs Service)
 * Tests the Bearer-token middleware that guards all job endpoints.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

import jwt from 'jsonwebtoken';
import authMiddleware from '../../../services/jobs/src/middleware/authMiddleware.js';

const mockNext = () => vi.fn();

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('Jobs Auth Middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls next() and sets req.user when token is valid', () => {
    jwt.verify.mockReturnValue({ userId: 'uid-001' });

    const req = { headers: { authorization: 'Bearer valid.jwt.token' } };
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ userId: 'uid-001' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: No token' });
  });

  it('returns 401 when Authorization header lacks "Bearer " prefix', () => {
    const req = { headers: { authorization: 'just-a-token-no-prefix' } };
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when token is expired', () => {
    jwt.verify.mockImplementation(() => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      throw err;
    });

    const req = { headers: { authorization: 'Bearer expired.token.here' } };
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Unauthorized: Invalid token',
    });
  });

  it('returns 401 when token has invalid signature (tampered)', () => {
    jwt.verify.mockImplementation(() => {
      const err = new Error('invalid signature');
      err.name = 'JsonWebTokenError';
      throw err;
    });

    const req = {
      headers: { authorization: 'Bearer tampered.token.payload' },
    };
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when token is malformed (not a JWT)', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    const req = { headers: { authorization: 'Bearer not-a-jwt-at-all' } };
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
