// JobSphere Admin — new file, safe to delete without affecting core app
import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

// ── Mock model registry ───────────────────────────────────────────────────────
vi.mock("../../../services/admin/src/models/modelRegistry.js", () => ({
  getModels: vi.fn(),
}));

import { getModels } from "../../../services/admin/src/models/modelRegistry.js";
import {
  getUsers,
  banUser,
  getUserJobs,
} from "../../../services/admin/src/controllers/usersController.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json   = vi.fn().mockReturnValue(res);
  return res;
};

const validId = new mongoose.Types.ObjectId().toString();

describe("usersController", () => {
  let UserMock, JobMock, ModerationLogMock;

  beforeEach(() => {
    vi.clearAllMocks();

    UserMock = {
      find:           vi.fn(),
      findById:       vi.fn(),
      countDocuments: vi.fn(),
    };
    JobMock = {
      aggregate: vi.fn(),
      find:      vi.fn(),
    };
    ModerationLogMock = { create: vi.fn() };

    getModels.mockReturnValue({
      User:           UserMock,
      Job:            JobMock,
      ModerationLog:  ModerationLogMock,
    });
  });

  describe("getUsers", () => {
    it("returns paginated users with job counts", async () => {
      const fakeUsers = [
        { _id: { toString: () => "u1" }, name: "Alice", email: "a@t.com", createdAt: new Date(), bannedAt: null },
        { _id: { toString: () => "u2" }, name: "Bob",   email: "b@t.com", createdAt: new Date(), bannedAt: null },
      ];

      UserMock.find.mockReturnValue({
        sort:  vi.fn().mockReturnThis(),
        skip:  vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean:  vi.fn().mockResolvedValue(fakeUsers),
      });
      UserMock.countDocuments.mockResolvedValue(2);
      JobMock.aggregate.mockResolvedValue([
        { _id: "u1", count: 3 },
        { _id: "u2", count: 1 },
      ]);

      const req = { query: { page: "1", limit: "20", search: "" } };
      const res = mockRes();

      await getUsers(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.total).toBe(2);
      expect(result.users[0].jobCount).toBe(3);
      expect(result.users[1].jobCount).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("applies search filter", async () => {
      UserMock.find.mockReturnValue({
        sort:  vi.fn().mockReturnThis(),
        skip:  vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean:  vi.fn().mockResolvedValue([]),
      });
      UserMock.countDocuments.mockResolvedValue(0);
      JobMock.aggregate.mockResolvedValue([]);

      const req = { query: { page: "1", limit: "20", search: "alice" } };
      const res = mockRes();

      await getUsers(req, res);

      // The filter passed to countDocuments should contain $or
      const filterArg = UserMock.countDocuments.mock.calls[0][0];
      expect(filterArg).toHaveProperty("$or");
    });

    it("calculates totalPages correctly", async () => {
      UserMock.find.mockReturnValue({
        sort:  vi.fn().mockReturnThis(),
        skip:  vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean:  vi.fn().mockResolvedValue([]),
      });
      UserMock.countDocuments.mockResolvedValue(45); // 45 users, limit 20 → 3 pages
      JobMock.aggregate.mockResolvedValue([]);

      const req = { query: { page: "1", limit: "20", search: "" } };
      const res = mockRes();
      await getUsers(req, res);

      expect(res.json.mock.calls[0][0].totalPages).toBe(3);
    });
  });

  describe("banUser", () => {
    it("sets bannedAt on the user and logs the action", async () => {
      const saveStub = vi.fn();
      const fakeUser = {
        _id:      validId,
        email:    "bad@actor.com",
        bannedAt: null,
        save:     saveStub,
      };
      UserMock.findById.mockResolvedValue(fakeUser);
      ModerationLogMock.create.mockResolvedValue({});

      const req = {
        params: { id: validId },
        admin:  { email: "admin@jobsphere.com" },
      };
      const res = mockRes();

      await banUser(req, res);

      expect(fakeUser.bannedAt).toBeInstanceOf(Date);
      expect(saveStub).toHaveBeenCalled();
      expect(ModerationLogMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: "ban_user", targetId: validId }),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("banned") }),
      );
    });

    it("returns 409 if user is already banned", async () => {
      UserMock.findById.mockResolvedValue({
        _id:      validId,
        email:    "already@banned.com",
        bannedAt: new Date("2025-01-01"),
      });

      const req = { params: { id: validId }, admin: { email: "a@admin.com" } };
      const res = mockRes();

      await banUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 404 when user not found", async () => {
      UserMock.findById.mockResolvedValue(null);

      const req = { params: { id: validId }, admin: { email: "a@admin.com" } };
      const res = mockRes();

      await banUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 for invalid ObjectId", async () => {
      const req = { params: { id: "not-an-id" }, admin: { email: "a@admin.com" } };
      const res = mockRes();

      await banUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getUserJobs", () => {
    it("returns user info and their jobs", async () => {
      const fakeUser = { _id: validId, name: "Alice", email: "a@t.com" };
      UserMock.findById = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(fakeUser),
      });
      JobMock.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { _id: "j1", company: "Google", position: "SWE", status: "interview" },
        ]),
      });

      const req = { params: { id: validId } };
      const res = mockRes();

      await getUserJobs(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.user.email).toBe("a@t.com");
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].company).toBe("Google");
    });
  });
});
