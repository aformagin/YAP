'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yap-dev-secret-change-in-prod';

/**
 * Verifies the JWT stored in the HttpOnly cookie named `token`.
 * Attaches req.user = { id, username, is_admin } on success.
 * Returns 401 if the token is missing or invalid.
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
