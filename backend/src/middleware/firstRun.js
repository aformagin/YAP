'use strict';

/**
 * firstRun middleware
 *
 * Checks whether the authenticated user has must_change_password = 1.
 * If so, only the /api/auth/change-password endpoint is allowed through.
 * All other requests receive a 403 with a prompt to change password first.
 *
 * FIX #1: This middleware is now mounted at the app level in index.js for all
 * protected route groups.  Because route-level authMiddleware runs inside each
 * router (after this middleware in the global chain), req.user may not be set
 * on the first pass.  We call next() in that case; the router's own
 * authMiddleware will issue the 401 if the request is truly unauthenticated.
 *
 * Requires must_change_password to be present in the JWT payload — ensured by
 * the updated issueToken() in routes/auth.js and authMiddleware in auth.js.
 *
 * FIX (Finding #15): Removed the fragile `req.originalUrl.endsWith(...)` check.
 * A suffix match on a URL segment is not a reliable guard — any future route
 * whose path ends with '/change-password' would inadvertently bypass enforcement.
 * req.path strict equality is sufficient and unambiguous.
 */
function firstRunMiddleware(req, res, next) {
  // Pass through when authMiddleware has not yet populated req.user.
  // The route's own auth guard will handle the unauthenticated case.
  if (!req.user) {
    return next();
  }

  // Allow the change-password endpoint unconditionally (strict equality only)
  if (req.path === '/change-password') {
    return next();
  }

  if (req.user.must_change_password === 1) {
    return res.status(403).json({
      error: 'PasswordChangeRequired',
      message: 'You must change your password before continuing.',
    });
  }

  next();
}

module.exports = firstRunMiddleware;
