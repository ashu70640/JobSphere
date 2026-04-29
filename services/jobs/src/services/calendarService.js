/**
 * Calendar Service — Jobs Layer
 *
 * Handles Google Calendar event lifecycle (create / update / delete) for
 * interview-status jobs.
 *
 * Design decisions:
 *  1. This service does NOT store Google credentials.  It fetches decrypted
 *     tokens on-demand from the Auth Service via an internal endpoint guarded
 *     by a shared INTERNAL_SERVICE_SECRET.  This keeps a single source of
 *     truth for user credentials and avoids duplicating encryption logic.
 *
 *  2. Calendar sync is BEST-EFFORT: failures are logged but never bubble up
 *     to the caller.  A failed calendar sync must never break job creation.
 *
 *  3. All Google API calls are wrapped with exponential-backoff retry to
 *     handle transient network / quota errors gracefully.
 *
 * Env vars (jobs service .env):
 *  AUTH_SERVICE_URL          — e.g. http://auth-service:5001  (Docker)
 *                                  or http://localhost:5001    (local dev)
 *  INTERNAL_SERVICE_SECRET   — must match the auth service value
 *  GOOGLE_CLIENT_ID          — needed to build the OAuth2 client here
 *  GOOGLE_CLIENT_SECRET
 */

import { google } from 'googleapis';
import { withRetry } from '../utils/retry.js';

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

// ─── Token fetching ───────────────────────────────────────────────────────────

/**
 * Fetch decrypted Google tokens for a user from the Auth Service.
 * Returns null if:
 *  - user hasn't connected Google Calendar, or
 *  - calendar sync is disabled, or
 *  - the auth service is unreachable (we log but don't throw).
 */
const fetchTokens = async (userId) => {
  try {
    const res = await fetch(
      `${AUTH_SERVICE_URL}/api/v1/auth/internal/tokens/${userId}`,
      {
        headers: {
          'x-service-secret': process.env.INTERNAL_SERVICE_SECRET,
        },
      },
    );

    if (res.status === 403 || res.status === 404) return null; // not connected or disabled
    if (!res.ok) throw new Error(`Auth service responded ${res.status}`);

    return await res.json(); // { accessToken, refreshToken, tokenExpiry }
  } catch (err) {
    console.error('[CalendarService] fetchTokens error:', err.message);
    return null;
  }
};

// ─── OAuth2 client builder ────────────────────────────────────────────────────

const buildOAuth2Client = (tokens) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({
    access_token:  tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  return client;
};

// ─── Calendar event builder ───────────────────────────────────────────────────

/**
 * Construct a Google Calendar event resource from a Job document.
 *
 * Duration: always 1 hour (interviews rarely have a known end time).
 * Reminders: 24-hour email + 30-minute popup — sensible defaults.
 */
const buildEventResource = (job) => {
  // Combine interviewDate (YYYY-MM-DD) with interviewTime (HH:MM)
  const datePart = new Date(job.interviewDate).toISOString().split('T')[0];
  const timePart = job.interviewTime || '09:00';
  const startDate = new Date(`${datePart}T${timePart}:00.000Z`);
  const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

  const typeLabel  = job.interviewType  ? `Type: ${job.interviewType}`       : '';
  const roundLabel = job.interviewRound ? `Round: ${job.interviewRound}`      : '';
  const nameLabel  = job.interviewerName ? `Interviewer: ${job.interviewerName}` : '';
  const descSnip   = job.description?.substring(0, 300) ?? '';

  const descLines = [typeLabel, roundLabel, nameLabel, '', 'Job Description:', descSnip]
    .filter(Boolean)
    .join('\n');

  return {
    summary: `Interview — ${job.position} @ ${job.company}`,
    description: descLines,
    start: { dateTime: startDate.toISOString(), timeZone: 'UTC' },
    end:   { dateTime: endDate.toISOString(),   timeZone: 'UTC' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email',  minutes: 24 * 60 },
        { method: 'popup',  minutes: 30 },
      ],
    },
    // Colour: "Banana" (yellow) — visually distinct from personal events
    colorId: '5',
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a Google Calendar event for an interview job.
 * Returns the eventId (stored on the Job document) or null on failure.
 */
export const createCalendarEvent = async (userId, job) => {
  if (!job.interviewDate) return null;

  const tokens = await fetchTokens(userId);
  if (!tokens) return null;

  try {
    const auth     = buildOAuth2Client(tokens);
    const calendar = google.calendar({ version: 'v3', auth });
    const resource = buildEventResource(job);

    const response = await withRetry(
      () => calendar.events.insert({ calendarId: 'primary', resource }),
      { maxAttempts: 3, label: 'createCalendarEvent' },
    );

    console.log(`[CalendarService] Event created: ${response.data.id} for job ${job._id}`);
    return response.data.id;
  } catch (err) {
    console.error('[CalendarService] createCalendarEvent failed:', err.message);
    return null; // best-effort — do not fail job creation
  }
};

/**
 * Update an existing Google Calendar event.
 * Silently no-ops if no eventId is stored (calendar was added post-creation).
 */
export const updateCalendarEvent = async (userId, job) => {
  if (!job.calendarEventId || !job.interviewDate) return;

  const tokens = await fetchTokens(userId);
  if (!tokens) return;

  try {
    const auth     = buildOAuth2Client(tokens);
    const calendar = google.calendar({ version: 'v3', auth });
    const resource = buildEventResource(job);

    await withRetry(
      () =>
        calendar.events.update({
          calendarId: 'primary',
          eventId:    job.calendarEventId,
          resource,
        }),
      { maxAttempts: 3, label: 'updateCalendarEvent' },
    );

    console.log(`[CalendarService] Event updated: ${job.calendarEventId}`);
  } catch (err) {
    console.error('[CalendarService] updateCalendarEvent failed:', err.message);
  }
};

/**
 * Delete a Google Calendar event when a job is deleted or status changes
 * away from "interview".
 */
export const deleteCalendarEvent = async (userId, calendarEventId) => {
  if (!calendarEventId) return;

  const tokens = await fetchTokens(userId);
  if (!tokens) return;

  try {
    const auth     = buildOAuth2Client(tokens);
    const calendar = google.calendar({ version: 'v3', auth });

    await withRetry(
      () =>
        calendar.events.delete({
          calendarId: 'primary',
          eventId:    calendarEventId,
        }),
      { maxAttempts: 3, label: 'deleteCalendarEvent' },
    );

    console.log(`[CalendarService] Event deleted: ${calendarEventId}`);
  } catch (err) {
    // 410 = already deleted on Google's side — not an error
    if (err.code !== 410) {
      console.error('[CalendarService] deleteCalendarEvent failed:', err.message);
    }
  }
};
