'use strict';

/**
 * firstRun middleware
 *
 * Checks whether the authenticated user has must_change_password = 1.
 * If so, all requests are blocked with a 403 response prompting the user to
 * change their password first.
 *
 * Middleware chain (see index.js lines 68-72):
 *   authMiddleware (app-level) → firstRunMiddleware (app-level) → route handler
 *
 * authMiddleware always runs before this middleware and either populates
 * req.user or returns a 401 response.  By the time this middleware executes,
 * req.user is guaranteed to be set.
 *
 * Requires must_change_password to be present in the JWT payload — ensured by
 * the updated issueToken() in routes/auth.js and authMiddleware in auth.js.
 */
function firstRunMiddleware(req, res, next) {
  if (req.user.must_change_password === 1) {
    return res.status(403).json({
      error: 'PasswordChangeRequired',
      message: 'You must change your password before continuing.',
    });
  }

  next();
}

module.exports = firstRunMiddleware;
