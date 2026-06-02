/**
 * Calendar Routes — Auth Service
 *
 * User-facing routes require the standard JWT middleware.
 * The /internal route is guarded by the service-secret middleware.
 */

import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import internalAuthMiddleware from '../middleware/internalAuthMiddleware.js';
import {
  getAuthUrl,
  handleOAuthCallback,
  getCalendarStatus,
  toggleCalendarSync,
  disconnectCalendar,
  getCalendarTokensInternal,
} from '../controllers/calendarController.js';
import { getUserInternal } from '../controllers/authController.js';

const router = express.Router();

// ── User-facing ───────────────────────────────────────────────────────────────
router.get('/auth-url', authMiddleware, getAuthUrl);
router.get('/callback', handleOAuthCallback);          // no JWT — browser redirect
router.get('/status', authMiddleware, getCalendarStatus);
router.patch('/toggle', authMiddleware, toggleCalendarSync);
router.delete('/disconnect', authMiddleware, disconnectCalendar);

// ── Internal (jobs service → auth service) ────────────────────────────────────
// Mounted at /api/v1/auth/internal — so these resolve to:
//   GET /api/v1/auth/internal/tokens/:userId
//   GET /api/v1/auth/internal/user/:userId
router.get('/tokens/:userId', internalAuthMiddleware, getCalendarTokensInternal);
router.get('/user/:userId',   internalAuthMiddleware, getUserInternal);

export default router;
