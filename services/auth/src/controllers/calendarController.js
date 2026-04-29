/**
 * Calendar Controller — Auth Service
 *
 * Routes:
 *  GET  /api/v1/auth/calendar/auth-url       → generate Google consent URL
 *  GET  /api/v1/auth/calendar/callback       → OAuth callback (browser redirect)
 *  GET  /api/v1/auth/calendar/status         → connection status for current user
 *  PATCH /api/v1/auth/calendar/toggle        → enable / disable auto-sync
 *  DELETE /api/v1/auth/calendar/disconnect   → revoke & remove stored tokens
 *
 *  GET  /api/v1/auth/internal/calendar-tokens/:userId  ← internal-only (jobs service)
 */

import User from '../models/User.js';
import {
  encryptToken,
  decryptToken,
  generateAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
} from '../services/googleCalendarService.js';

// ─── Public user-facing endpoints ─────────────────────────────────────────────

/**
 * GET /api/v1/auth/calendar/auth-url
 * Returns the Google OAuth consent-screen URL.
 * The userId is embedded in the `state` query param so the callback
 * knows which user to update without relying on a session cookie.
 */
export const getAuthUrl = (req, res) => {
  try {
    const url = generateAuthUrl(req.user.userId);
    res.json({ url });
  } catch (err) {
    console.error('[Calendar] getAuthUrl error:', err.message);
    res.status(500).json({ message: 'Failed to generate Google auth URL' });
  }
};

/**
 * GET /api/v1/auth/calendar/callback?code=...&state=<userId>
 * Google redirects here after user grants permission.
 * No JWT needed — userId is carried in `state`.
 */
export const handleOAuthCallback = async (req, res) => {
  const { code, state: userId, error } = req.query;

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const failUrl = `${clientUrl}/profile?calendar=error`;
  const successUrl = `${clientUrl}/profile?calendar=connected`;

  // User denied access on Google's screen
  if (error || !code || !userId) {
    return res.redirect(failUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const user = await User.findById(userId);
    if (!user) return res.redirect(failUrl);

    // Encrypt before persisting — refresh token is precious; only Google
    // issues it once per consent (unless prompt:'consent' forces it each time).
    user.googleCalendar.accessToken = encryptToken(tokens.access_token);
    user.googleCalendar.tokenExpiry = new Date(tokens.expiry_date);
    user.googleCalendar.calendarEnabled = true;

    // Google only returns refresh_token on first authorization or when
    // prompt:'consent' is used. Preserve the existing one if absent.
    if (tokens.refresh_token) {
      user.googleCalendar.refreshToken = encryptToken(tokens.refresh_token);
    }

    await user.save();

    console.log(`[Calendar] Connected for user ${userId}`);
    res.redirect(successUrl);
  } catch (err) {
    console.error('[Calendar] OAuth callback error:', err.message);
    res.redirect(failUrl);
  }
};

/**
 * GET /api/v1/auth/calendar/status
 * Returns whether the current user has Google Calendar connected and enabled.
 */
export const getCalendarStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('googleCalendar');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      connected: !!user.googleCalendar?.refreshToken,
      enabled: user.googleCalendar?.calendarEnabled ?? false,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PATCH /api/v1/auth/calendar/toggle
 * Body: { enabled: boolean }
 * Only works if the user has already connected Google Calendar.
 */
export const toggleCalendarSync = async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: '"enabled" must be a boolean' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.googleCalendar?.refreshToken) {
      return res
        .status(400)
        .json({ message: 'Google Calendar is not connected yet' });
    }

    user.googleCalendar.calendarEnabled = enabled;
    await user.save();

    res.json({
      message: `Calendar sync ${enabled ? 'enabled' : 'disabled'}`,
      enabled,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * DELETE /api/v1/auth/calendar/disconnect
 * Clears all stored Google tokens. Future interview creates will not sync.
 */
export const disconnectCalendar = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.googleCalendar = {
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      calendarEnabled: false,
    };

    await user.save();

    console.log(`[Calendar] Disconnected for user ${req.user.userId}`);
    res.json({ message: 'Google Calendar disconnected successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Internal endpoint (jobs service only) ────────────────────────────────────

/**
 * GET /api/v1/auth/internal/calendar-tokens/:userId
 * Returns decrypted tokens for the jobs service to use when creating events.
 * Protected by internalAuthMiddleware (x-service-secret header).
 *
 * Auto-refreshes an expired access token before responding so the
 * jobs service never has to deal with token expiry itself.
 */
export const getCalendarTokensInternal = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('googleCalendar');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const gc = user.googleCalendar;
    if (!gc?.refreshToken) {
      return res.status(404).json({ message: 'Google Calendar not connected' });
    }

    if (!gc.calendarEnabled) {
      return res.status(403).json({ message: 'Calendar sync is disabled by user' });
    }

    let accessToken = gc.accessToken ? decryptToken(gc.accessToken) : null;
    let tokenExpiry = gc.tokenExpiry;

    // Proactively refresh if the access token expires within 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    if (!accessToken || !tokenExpiry || Date.now() + fiveMinutes >= tokenExpiry.getTime()) {
      const refreshed = await refreshAccessToken(gc.refreshToken);
      accessToken = refreshed.accessToken;
      tokenExpiry = new Date(refreshed.expiry_date);

      // Persist the refreshed access token
      user.googleCalendar.accessToken = encryptToken(accessToken);
      user.googleCalendar.tokenExpiry = tokenExpiry;
      await user.save();
    }

    res.json({
      accessToken,
      refreshToken: decryptToken(gc.refreshToken),
      tokenExpiry,
    });
  } catch (err) {
    console.error('[Calendar] getCalendarTokensInternal error:', err.message);
    res.status(500).json({ message: 'Failed to retrieve calendar tokens' });
  }
};
