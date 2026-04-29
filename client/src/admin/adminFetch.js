// JobSphere Admin — new file, safe to delete without affecting core app
// Dedicated fetch helper for admin API calls.
// Completely separate from the main app's auth — uses adminToken from localStorage.

import { API_ADMIN } from "../utils/api";
const ADMIN_BASE = API_ADMIN.replace("/api/admin", ""); // Base URL prefix for admin service

export const adminFetch = async (path, options = {}) => {
  const token = localStorage.getItem("adminToken");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${ADMIN_BASE}${path}`, { ...options, headers });

  // Auto-logout on expired/invalid token
  if (res.status === 401) {
    localStorage.removeItem("adminToken");
    window.location.href = "/admin/login";
    return null;
  }

  return res;
};
