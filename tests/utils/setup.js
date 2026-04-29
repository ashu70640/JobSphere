/**
 * Vitest setupFiles — runs in every test worker before each test file.
 */
import { vi } from 'vitest';

// Set environment variables available in every test
process.env.JWT_SECRET = 'test-jwt-secret-jobsphere';
process.env.JWT_EXPIRES = '15m';
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'MOCK_GEMINI_KEY_FOR_TESTS';

// Suppress noisy console output during tests.
// Remove lines below if you want to see service logs while debugging.
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
