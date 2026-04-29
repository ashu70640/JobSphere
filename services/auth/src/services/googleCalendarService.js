/**
 * Google Calendar Service — Auth Layer
 *
 * Responsibilities:
 *  - Token encryption / decryption (AES-256-GCM)
 *  - OAuth2 client factory
 *  - Auth URL generation
 *  - Code → token exchange
 *  - Access token refresh (called before every event operation)
 *
 * Encryption strategy:
 *  Each encrypted value is stored as "iv:ciphertext:authTag" (all hex).
 *  A fresh random IV per encryption prevents identical plaintext producing
 *  identical ciphertext.  The GCM auth tag detects any tampering in storage.
 *
 * Env vars required:
 *  TOKEN_ENCRYPTION_KEY  — 64 hex chars = 32 raw bytes (AES-256)
 *  GOOGLE_CLIENT_ID
 *  GOOGLE_CLIENT_SECRET
 *  GOOGLE_REDIRECT_URI   — e.g. http://localhost/api/v1/auth/calendar/callback
 */

import crypto from 'crypto';
import { google } from 'googleapis';

const ALGORITHM = 'aes-256-gcm';

// Derive a 32-byte Buffer from the hex env variable.
// We lazy-evaluate so the service can be imported even when the env var
// is not set (unit tests, non-calendar routes).
const getEncryptionKey = () => {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
};

// ─── Encryption helpers ───────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string → "ivHex:ciphertextHex:authTagHex"
 */
export const encryptToken = (plaintext) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
};

/**
 * Decrypt a value produced by encryptToken.
 */
export const decryptToken = (encryptedValue) => {
  const key = getEncryptionKey();
  const parts = encryptedValue.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted token format');

  const [ivHex, ciphertext, authTagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// ─── OAuth2 helpers ───────────────────────────────────────────────────────────

/**
 * Factory — creates a configured OAuth2 client.
 * Centralised so credentials never leak into controller code.
 */
export const createOAuth2Client = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

/**
 * Generate the Google consent-screen URL.
 * `state` = userId, carried through the redirect so we know which user
 * to update in the callback.
 */
export const generateAuthUrl = (userId) => {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',   // request a refresh token
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent',        // always show consent screen → guarantees refresh token
    state: userId,
  });
};

/**
 * Exchange an authorization code for access + refresh tokens.
 * Returns the raw tokens object from Google.
 */
export const exchangeCodeForTokens = async (code) => {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
};

/**
 * Use a stored refresh token to get a fresh access token.
 * Call this before any Calendar API operation when the stored
 * access token is expired (tokenExpiry < Date.now()).
 *
 * Returns { accessToken, expiry_date }.
 */
export const refreshAccessToken = async (encryptedRefreshToken) => {
  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: decryptToken(encryptedRefreshToken) });

  const { credentials } = await client.refreshAccessToken();
  return {
    accessToken: credentials.access_token,
    expiry_date: credentials.expiry_date,
  };
};
