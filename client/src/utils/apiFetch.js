/**
 * apiFetch — Authenticated fetch wrapper with automatic token refresh.
 *
 * Features:
 *  - Auto-injects  Authorization: Bearer <token>  from localStorage
 *  - On 401: silently refreshes the access token, then retries the request
 *  - Queues concurrent 401s so only ONE refresh call is ever made at a time
 *  - Force-logs out the user if the refresh token is missing or rejected
 *  - Transparent to FormData uploads — never overrides Content-Type
 *
 * Usage (drop-in replacement for fetch):
 *   import { apiFetch } from "../utils/apiFetch";
 *   const res = await apiFetch("/api/v1/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
 */

import { API_AUTH } from "./api";

// ── Module-level refresh state (shared across all concurrent requests) ─────────
let isRefreshing = false;
let refreshQueue  = []; // callbacks waiting for a new token

function processQueue(newToken) {
  refreshQueue.forEach(cb => cb(newToken));
  refreshQueue = [];
}

function forceLogout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userName");
  window.location.href = "/login";
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("accessToken");

  // Merge Authorization into any caller-supplied headers
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let response = await fetch(url, { ...options, headers });

  // Fast path — not an auth error
  if (response.status !== 401) return response;

  // ── 401 received — try to silently refresh ────────────────────────────────────
  const refreshToken = localStorage.getItem("refreshToken");

  if (!refreshToken) {
    forceLogout();
    return response;
  }

  // If another request is already refreshing, queue this one
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(async (newToken) => {
        const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
        resolve(await fetch(url, { ...options, headers: retryHeaders }));
      });
    });
  }

  isRefreshing = true;

  try {
    const refreshRes = await fetch(`${API_AUTH}/refresh`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) throw new Error("Refresh failed");

    const { accessToken: newToken } = await refreshRes.json();
    localStorage.setItem("accessToken", newToken);

    // Unblock all queued requests with the new token
    processQueue(newToken);

    // Retry the original request
    const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
    return await fetch(url, { ...options, headers: retryHeaders });

  } catch {
    // Refresh token is invalid/expired — force full logout
    forceLogout();
    return response;

  } finally {
    isRefreshing = false;
  }
}
