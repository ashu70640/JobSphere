/**
 * CalendarConnect
 *
 * Self-contained Google Calendar integration widget.
 * Displays in the Profile page under "Integrations".
 *
 * States:
 *  loading  → skeleton
 *  connected+enabled  → green badge, toggle ON, Disconnect button
 *  connected+disabled → yellow badge, toggle OFF, Disconnect button
 *  not connected      → "Connect Google Calendar" button
 *
 * Flow:
 *  1. Mount → GET /api/v1/auth/calendar/status
 *  2. "Connect" → GET /api/v1/auth/calendar/auth-url → redirect to Google
 *  3. Google redirects back → /profile?calendar=connected  (handled here via URLSearchParams)
 *  4. Toggle → PATCH /api/v1/auth/calendar/toggle
 *  5. Disconnect → DELETE /api/v1/auth/calendar/disconnect
 */

import { useState, useEffect, useCallback } from "react";

// Google's brand hex — using it directly keeps the button recognisable
const GOOGLE_BLUE = "#4285F4";

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatusBadge = ({ connected, enabled }) => {
  if (!connected)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        Not connected
      </span>
    );

  if (enabled)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Syncing
      </span>
    );

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-yellow-600 dark:text-yellow-400 font-medium">
      <span className="w-2 h-2 rounded-full bg-yellow-500" />
      Connected · Sync paused
    </span>
  );
};

// Simple toggle switch — no external library needed
const ToggleSwitch = ({ enabled, onChange, disabled }) => (
  <button
    role="switch"
    aria-checked={enabled}
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`
      relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      ${enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}
      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
    `}
  >
    <span
      className={`
        inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200
        ${enabled ? "translate-x-6" : "translate-x-1"}
      `}
    />
  </button>
);

// Google logo SVG (official brand asset, simplified)
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

// ─── Main component ───────────────────────────────────────────────────────────

import { API_AUTH as API_BASE } from "../utils/api";
import { apiFetch } from "../utils/apiFetch";

export default function CalendarConnect() {
  const [status, setStatus]     = useState({ connected: false, enabled: false });
  const [loading, setLoading]   = useState(true);
  const [toggling, setToggling] = useState(false);
  const [toast, setToast]       = useState(null); // { type: 'success'|'error', msg }

  // ── Show transient toast ────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch current calendar status ───────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/calendar/status`);
      if (!res.ok) throw new Error("Failed to fetch calendar status");
      const data = await res.json();
      setStatus(data);
    } catch {
      // Non-critical — silently fail, show as "not connected"
    } finally {
      setLoading(false);
    }
  }, []);

  // ── On mount: fetch status + handle redirect from Google ───────────────────
  useEffect(() => {
    fetchStatus();

    const params = new URLSearchParams(window.location.search);
    const calendarParam = params.get("calendar");

    if (calendarParam === "connected") {
      showToast("success", "Google Calendar connected! Interviews will sync automatically.");
      // Clean the query param without a page reload
      window.history.replaceState({}, "", window.location.pathname);
      fetchStatus(); // re-fetch to show updated state
    } else if (calendarParam === "error") {
      showToast("error", "Google Calendar connection failed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchStatus]);

  // ── Connect: redirect user to Google consent screen ────────────────────────
  const handleConnect = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/calendar/auth-url`);
      if (!res.ok) throw new Error("Could not get auth URL");
      const { url } = await res.json();
      window.location.href = url; // full-page redirect — standard OAuth flow
    } catch {
      showToast("error", "Failed to start Google Calendar connection.");
    }
  };

  // ── Toggle sync on / off ────────────────────────────────────────────────────
  const handleToggle = async (enabled) => {
    setToggling(true);
    try {
      const res = await apiFetch(`${API_BASE}/calendar/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      setStatus((prev) => ({ ...prev, enabled }));
      showToast("success", `Calendar sync ${enabled ? "enabled" : "paused"}.`);
    } catch {
      showToast("error", "Failed to update sync setting.");
    } finally {
      setToggling(false);
    }
  };

  // ── Disconnect ──────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect Google Calendar? Future interviews won't sync.")) return;
    try {
      const res = await apiFetch(`${API_BASE}/calendar/disconnect`, { method: "DELETE" });
      if (!res.ok) throw new Error("Disconnect failed");
      setStatus({ connected: false, enabled: false });
      showToast("success", "Google Calendar disconnected.");
    } catch {
      showToast("error", "Failed to disconnect.");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-pulse h-20 rounded-xl bg-gray-100 dark:bg-gray-700" />
    );
  }

  return (
    <div className="relative">
      {/* Toast notification */}
      {toast && (
        <div
          className={`
            absolute -top-12 left-0 right-0 text-sm text-center py-2 px-4 rounded-lg font-medium
            ${toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
              : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
            }
          `}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* Left: icon + label + status badge */}
        <div className="flex items-start gap-3">
          {/* Calendar icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Google Calendar
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Auto-create events when interviews are scheduled
            </p>
            <div className="mt-1.5">
              <StatusBadge {...status} />
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3 sm:flex-shrink-0">
          {status.connected ? (
            <>
              {/* Sync toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {status.enabled ? "On" : "Off"}
                </span>
                <ToggleSwitch
                  enabled={status.enabled}
                  onChange={handleToggle}
                  disabled={toggling}
                />
              </div>

              {/* Disconnect */}
              <button
                onClick={handleDisconnect}
                className="text-xs text-red-600 dark:text-red-400 hover:underline transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            /* Connect button — styled with Google brand colours */
            <button
              onClick={handleConnect}
              className="
                inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                bg-white border border-gray-300 text-gray-700
                hover:bg-gray-50 active:bg-gray-100
                dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200
                dark:hover:bg-gray-600
                shadow-sm transition-all duration-150 focus:outline-none
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              "
            >
              <GoogleLogo />
              Connect Google Calendar
            </button>
          )}
        </div>
      </div>

      {/* Info note — only shown when connected */}
      {status.connected && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 pl-1">
          Interview events are automatically created with a 24-hour email reminder
          and a 30-minute popup. Rescheduled or cancelled interviews update
          the calendar event accordingly.
        </p>
      )}
    </div>
  );
}
