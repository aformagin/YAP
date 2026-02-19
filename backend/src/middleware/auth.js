'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yap-dev-secret-change-in-prod';

/**
 * Verifies the JWT stored in the HttpOnly cookie named `token`.
 * Attaches req.user = { id, username, is_admin, must_change_password } on success.
 * Returns 401 if the token is missing or invalid.
 *
 * FIX #1: must_change_password is now extracted from the payload and forwarded
 * to req.user so that firstRunMiddleware can correctly enforce the flag.
 * Previously this field was absent from the payload, making the enforcement
 * permanently inoperative (undefined === 1 is always false).
 */
function authMiddleware(req, res, next) {
  const token = req.cookies && req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.id,
      username: payload.username,
      is_admin: payload.is_admin,
      must_change_password: payload.must_change_password, // FIX #1
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

/**
 * Must be used AFTER authMiddleware.
 * Returns 403 if the authenticated user is not an admin.
 */
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.is_admin !== 1) {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware };
