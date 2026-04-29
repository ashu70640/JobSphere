// JobSphere Admin — new file, safe to delete without affecting core app
import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import jwt    from "jsonwebtoken";

// ── Mock model registry ───────────────────────────────────────────────────────
vi.mock("../../../services/admin/src/models/modelRegistry.js", () => ({
  getModels: vi.fn(),
}));

import { getModels } from "../../../services/admin/src/models/modelRegistry.js";
import { adminLogin, adminMe } from "../../../services/admin/src/controllers/adminAuthController.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json   = vi.fn().mockReturnValue(res);
  return res;
};
const mockReq = (body = {}, admin = null) => ({ body, admin });

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("adminAuthController", () => {
  let AdminMock;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_JWT_SECRET = "test-admin-secret";

    AdminMock = {
      findOne: vi.fn(),
    };
    getModels.mockReturnValue({ Admin: AdminMock });
  });

  describe("adminLogin", () => {
    it("returns 400 when email is missing", async () => {
      const req = mockReq({ password: "pass" });
      const res = mockRes();

      await adminLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("required") }),
      );
    });

    it("returns 400 when password is missing", async () => {
      const req = mockReq({ email: "a@b.com" });
      const res = mockRes();

      await adminLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 401 when admin not found", async () => {
      AdminMock.findOne.mockResolvedValue(null);
      const req = mockReq({ email: "no@one.com", password: "x" });
      const res = mockRes();

      await adminLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
    });

    it("returns 401 on wrong password", async () => {
      const hashed = await bcrypt.hash("correct", 10);
      AdminMock.findOne.mockResolvedValue({
        _id: "abc",
        email: "admin@jobsphere.com",
        role:  "superadmin",
        password: hashed,
      });
      const req = mockReq({ email: "admin@jobsphere.com", password: "wrong" });
      const res = mockRes();

      await adminLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns token on successful login", async () => {
      const hashed = await bcrypt.hash("correct", 10);
      AdminMock.findOne.mockResolvedValue({
        _id: "abc123",
        email: "admin@jobsphere.com",
        role:  "superadmin",
        password: hashed,
      });
      const req = mockReq({ email: "admin@jobsphere.com", password: "correct" });
      const res = mockRes();

      await adminLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const call = res.json.mock.calls[0][0];
      expect(call).toHaveProperty("token");
      expect(call.admin.email).toBe("admin@jobsphere.com");
      expect(call.admin.role).toBe("superadmin");

      // token should be a valid JWT
      const decoded = jwt.verify(call.token, "test-admin-secret");
      expect(decoded.email).toBe("admin@jobsphere.com");
    });
  });

  describe("adminMe", () => {
    it("returns the admin payload from req.admin", () => {
      const req = mockReq({}, { email: "admin@jobsphere.com", role: "superadmin" });
      const res = mockRes();

      adminMe(req, res);

      expect(res.json).toHaveBeenCalledWith({
        admin: { email: "admin@jobsphere.com", role: "superadmin" },
      });
    });
  });
});
