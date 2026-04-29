// Central API base URLs
// In development: empty string → relative paths → Vite proxy handles routing
// In production (Render): full URLs from environment variables

const AUTH_URL  = import.meta.env.VITE_AUTH_URL  || "";
const JOBS_URL  = import.meta.env.VITE_JOBS_URL  || "";
const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || "";

export const API_AUTH  = `${AUTH_URL}/api/v1/auth`;
export const API_JOBS  = `${JOBS_URL}/api/v1/jobs`;
export const API_ADMIN = `${ADMIN_URL}/api/admin`;
