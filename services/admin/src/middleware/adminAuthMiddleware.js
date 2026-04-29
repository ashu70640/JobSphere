// JobSphere Admin — new file, safe to delete without affecting core app
import jwt from "jsonwebtoken";

export const adminAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Admin token required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.admin = decoded; // { adminId, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired admin token" });
  }
};
