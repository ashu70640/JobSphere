import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-jobsphere';

/**
 * Valid 15-min access token for the given userId.
 */
export const generateAccessToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });

/**
 * Expired token (1 second in the past).
 */
export const generateExpiredToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: '-1s' });

/**
 * Token signed with a wrong secret — will fail verification.
 */
export const generateTamperedToken = (userId) =>
  jwt.sign({ userId }, 'wrong-secret-attacker-key', { expiresIn: '15m' });

/**
 * Token with a valid structure but a non-existent userId.
 */
export const generateOrphanToken = () =>
  jwt.sign({ userId: '000000000000000000000000' }, JWT_SECRET, {
    expiresIn: '15m',
  });

/**
 * 40-byte hex refresh token (mirrors crypto.randomBytes(40).toString('hex')).
 */
export const generateRefreshToken = () =>
  crypto.randomBytes(40).toString('hex');

/**
 * Decode a token without verifying the signature.
 */
export const decodeToken = (token) => jwt.decode(token);

/**
 * Verify and return the payload, or null on failure.
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

/**
 * Return the Bearer header string ready for supertest.
 */
export const authHeader = (userId) => `Bearer ${generateAccessToken(userId)}`;
