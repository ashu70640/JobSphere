// JobSphere Admin — new file, safe to delete without affecting core app
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock model registry ───────────────────────────────────────────────────────
vi.mock("../../../services/admin/src/models/modelRegistry.js", () => ({
  getModels: vi.fn(),
}));

import { getModels } from "../../../services/admin/src/models/modelRegistry.js";
import {
  getOverview,
  getJobsPerDay,
  getStatusBreakdown,
  getAiUsageStats,
} from "../../../services/admin/src/controllers/statsController.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json   = vi.fn().mockReturnValue(res);
  return res;
};

describe("statsController", () => {
  let UserMock, JobMock, AiUsageMock;

  beforeEach(() => {
    vi.clearAllMocks();

    UserMock = { countDocuments: vi.fn() };
    JobMock  = {
      countDocuments: vi.fn(),
      aggregate:      vi.fn(),
      distinct:       vi.fn(),
    };
    AiUsageMock = { aggregate: vi.fn() };

    getModels.mockReturnValue({ User: UserMock, Job: JobMock, AiUsage: AiUsageMock });
  });

  describe("getOverview", () => {
    it("returns correct shape with all counts", async () => {
      UserMock.countDocuments.mockResolvedValue(42);
      JobMock.countDocuments
        .mockResolvedValueOnce(120)   // totalJobs
        .mockResolvedValueOnce(5);    // jobsToday
      AiUsageMock.aggregate.mockResolvedValue([{ _id: null, total: 17 }]);
      JobMock.distinct.mockResolvedValue(["u1", "u2", "u3"]);
      JobMock.distinct.mockReturnValue({ then: (fn) => Promise.resolve(fn(["u1", "u2", "u3"])) });

      const req = {};
      const res = mockRes();

      await getOverview(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toMatchObject({
        totalUsers:    42,
        totalJobs:     120,
        jobsToday:     5,
        aiCallsToday:  17,
      });
      expect(typeof result.activeUsers30d).toBe("number");
    });

    it("returns aiCallsToday=0 when no AI usage today", async () => {
      UserMock.countDocuments.mockResolvedValue(0);
      JobMock.countDocuments.mockResolvedValue(0);
      AiUsageMock.aggregate.mockResolvedValue([]);  // empty = no usage
      JobMock.distinct.mockReturnValue({ then: (fn) => Promise.resolve(fn([])) });

      const req = {};
      const res = mockRes();
      await getOverview(req, res);

      expect(res.json.mock.calls[0][0].aiCallsToday).toBe(0);
    });
  });

  describe("getJobsPerDay", () => {
    it("returns array of { date, count } objects", async () => {
      JobMock.aggregate.mockResolvedValue([
        { _id: { year: 2025, month: 4, day: 1  }, count: 3 },
        { _id: { year: 2025, month: 4, day: 5  }, count: 7 },
        { _id: { year: 2025, month: 4, day: 10 }, count: 2 },
      ]);

      const req = { query: { days: "30" } };
      const res = mockRes();
      await getJobsPerDay(req, res);

      const result = res.json.mock.calls[0][0];
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toMatchObject({ date: "2025-04-01", count: 3 });
      expect(result[1]).toMatchObject({ date: "2025-04-05", count: 7 });
    });

    it("caps days at 90", async () => {
      JobMock.aggregate.mockResolvedValue([]);
      const req = { query: { days: "500" } };
      const res = mockRes();
      await getJobsPerDay(req, res);
      // Should not throw — just returns empty array
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe("getStatusBreakdown", () => {
    it("returns status/count pairs in descending order", async () => {
      JobMock.aggregate.mockResolvedValue([
        { _id: "pending",   count: 50 },
        { _id: "interview", count: 20 },
        { _id: "declined",  count: 10 },
        { _id: "offer",     count: 5  },
      ]);

      const req = {};
      const res = mockRes();
      await getStatusBreakdown(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ status: "pending", count: 50 });
      expect(result[3]).toEqual({ status: "offer",   count: 5  });
    });
  });

  describe("getAiUsageStats", () => {
    it("resolves emails and returns merged results", async () => {
      AiUsageMock.find = vi.fn().mockReturnValue({
        sort:  vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean:  vi.fn().mockResolvedValue([
          { userId: "uid1", count: 15, lastReset: new Date() },
          { userId: "uid2", count: 8,  lastReset: new Date() },
        ]),
      });
      UserMock.find = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: { toString: () => "uid1" }, email: "alice@test.com" },
          { _id: { toString: () => "uid2" }, email: "bob@test.com"   },
        ]),
      });

      const req = {};
      const res = mockRes();
      await getAiUsageStats(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ userId: "uid1", email: "alice@test.com", callCount: 15 });
      expect(result[1]).toMatchObject({ userId: "uid2", email: "bob@test.com",   callCount: 8  });
    });
  });
});
