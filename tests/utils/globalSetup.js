/**
 * Vitest globalSetup — runs once before the whole test suite in a separate
 * process.  We set env vars here so every worker process inherits them.
 */
export default async function globalSetup() {
  process.env.JWT_SECRET = 'test-jwt-secret-jobsphere';
  process.env.JWT_EXPIRES = '15m';
  process.env.NODE_ENV = 'test';
  process.env.GEMINI_API_KEY = 'MOCK_GEMINI_KEY_FOR_TESTS';
  process.env.PORT = '0'; // prevent services from binding a real port

  // MONGO_URI is set per-test-file via testDb.connect() since each file
  // gets its own in-memory DB instance for full isolation.
}
