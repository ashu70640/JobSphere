import jwt from "jsonwebtoken";

/**
 * Verifies Bearer JWT and attaches req.user = { userId }.
 * Kept intentionally lean — no DB/Redis round-trip.
 * The JWT is stateless; revocation is handled at the refresh-token layer.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    const msg = error.name === "TokenExpiredError" ? "Token expired" : "Token is not valid";
    res.status(401).json({ message: msg });
  }
};

export default authMiddleware;
