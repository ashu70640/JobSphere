/**
 * Internal Service Auth Middleware
 *
 * Guards endpoints that should only be callable by other
 * trusted backend services (e.g. jobs-service → auth-service).
 *
 * Uses a shared secret instead of a JWT so there is no bootstrapping
 * problem (no chicken-and-egg token issue between services).
 *
 * Env var: INTERNAL_SERVICE_SECRET — must match across services.
 */

const internalAuthMiddleware = (req, res, next) => {
  const secret = req.headers['x-service-secret'];

  if (!secret || secret !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(401).json({ message: 'Unauthorized: internal endpoint' });
  }

  next();
};

export default internalAuthMiddleware;
