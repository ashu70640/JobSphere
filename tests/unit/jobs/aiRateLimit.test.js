/**
 * Unit Tests — AI Rate Limit Middleware
 * Verifies the 20-requests/day-per-user cap and daily reset logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/jobs/src/models/AiUsage.js', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

import AiUsage from '../../../services/jobs/src/models/AiUsage.js';
import { aiRateLimit } from '../../../services/jobs/src/middleware/aiRateLimit.js';

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = () => vi.fn();

const makeUsage = (count, daysAgo = 0) => {
  const lastReset = new Date();
  lastReset.setDate(lastReset.getDate() - daysAgo);
  return {
    userId: 'uid-001',
    count,
    lastReset,
    save: vi.fn().mockResolvedValue(true),
  };
};

describe('AI Rate Limit Middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls next() and increments count when under daily limit', async () => {
    const usage = makeUsage(5); // 5 < 20
    AiUsage.findOne.mockResolvedValue(usage);

    const req = { user: { userId: 'uid-001' } };
    const res = mockRes();
    const next = mockNext();

    await aiRateLimit(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(usage.count).toBe(6);
    expect(usage.save).toHaveBeenCalled();
  });

  it('returns 429 when user has reached the 20/day limit', async () => {
    const usage = makeUsage(20); // exactly at limit
    AiUsage.findOne.mockResolvedValue(usage);

    const req = { user: { userId: 'uid-001' } };
    const res = mockRes();
    const next = mockNext();

    await aiRateLimit(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Daily AI limit exceeded (20/day)',
    });
  });

  it('returns 429 when count exceeds 20 (e.g. count=25)', async () => {
    const usage = makeUsage(25);
    AiUsage.findOne.mockResolvedValue(usage);

    const req = { user: { userId: 'uid-001' } };
    const res = mockRes();
    const next = mockNext();

    await aiRateLimit(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it('resets count to 0 on a new day and allows the request', async () => {
    const usage = makeUsage(20, 1); // yesterday, count was 20
    AiUsage.findOne.mockResolvedValue(usage);

    const req = { user: { userId: 'uid-001' } };
    const res = mockRes();
    const next = mockNext();

    await aiRateLimit(req, res, next);

    // After reset the count should be 1 (reset to 0, then incremented to 1)
    expect(usage.count).toBe(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('creates a new AiUsage record when none exists for the user', async () => {
    AiUsage.findOne.mockResolvedValue(null);
    const newUsage = makeUsage(0);
    AiUsage.create.mockResolvedValue(newUsage);

    const req = { user: { userId: 'uid-new' } };
    const res = mockRes();
    const next = mockNext();

    await aiRateLimit(req, res, next);

    expect(AiUsage.create).toHaveBeenCalledWith({ userId: 'uid-new' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows the 19th request (boundary check)', async () => {
    const usage = makeUsage(19);
    AiUsage.findOne.mockResolvedValue(usage);

    const req = { user: { userId: 'uid-001' } };
    const res = mockRes();
    const next = mockNext();

    await aiRateLimit(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(usage.count).toBe(20);
  });
});
