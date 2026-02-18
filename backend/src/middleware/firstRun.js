'use strict';

/**
 * firstRun middleware
 *
 * Checks whether the authenticated user has must_change_password = 1.
 * If so, only the /api/auth/change-password endpoint is allowed through.
 * All other requests receive a 403 with a prompt to change password first.
 *
 * This middleware must be applied AFTER authMiddleware.
 */
function firstRunMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Allow access to change-password endpoint unconditionally
  if (req.path === '/change-password' || req.originalUrl.endsWith('/change-password')) {
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
