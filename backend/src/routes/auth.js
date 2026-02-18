'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'yap-dev-secret-change-in-prod';
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const BCRYPT_ROUNDS = 12;

/**
 * Helper: issue a signed JWT and write it as an HttpOnly cookie.
 */
function issueToken(res, user) {
  const payload = {
    id: user.id,
    username: user.username,
    is_admin: user.is_admin,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    // secure: true  // Enable in production with HTTPS
  });

  return token;
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).json({ error: 'BadRequest', message: 'username and password are required' });
  }
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'BadRequest', message: 'Invalid input types' });
  }
  if (!validator.isLength(username, { min: 1, max: 64 })) {
    return res.status(400).json({ error: 'BadRequest', message: 'Invalid username length' });
  }

  // Lookup user (parameterized query)
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    // Constant-time response to prevent user enumeration
    bcrypt.compareSync('dummy', '$2b$12$invalidhashpaddingtomatch32chars12345678');
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
  }

  issueToken(res, user);

  return res.status(200).json({
    id: user.id,
    username: user.username,
    is_admin: user.is_admin === 1,
    must_change_password: user.must_change_password === 1,
    theme_preference: user.theme_preference,
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  return res.status(200).json({ message: 'Logged out successfully' });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me  (authenticated)
// ---------------------------------------------------------------------------
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, is_admin, must_change_password, theme_preference, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'NotFound', message: 'User not found' });
  }

  return res.status(200).json({
    id: user.id,
    username: user.username,
    is_admin: user.is_admin === 1,
    must_change_password: user.must_change_password === 1,
    theme_preference: user.theme_preference,
    created_at: user.created_at,
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/change-password  (authenticated)
// ---------------------------------------------------------------------------
router.post('/change-password', authMiddleware, (req, res) => {
  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({ error: 'BadRequest', message: 'old_password and new_password are required' });
  }
  if (typeof old_password !== 'string' || typeof new_password !== 'string') {
    return res.status(400).json({ error: 'BadRequest', message: 'Invalid input types' });
  }
  if (!validator.isLength(new_password, { min: 8, max: 128 })) {
    return res.status(400).json({ error: 'BadRequest', message: 'New password must be 8–128 characters' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'NotFound', message: 'User not found' });
  }

  const passwordMatch = bcrypt.compareSync(old_password, user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Old password is incorrect' });
  }

  const newHash = bcrypt.hashSync(new_password, BCRYPT_ROUNDS);
  db.prepare(
    'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?'
  ).run(newHash, req.user.id);

  return res.status(200).json({ message: 'Password changed successfully' });
});

module.exports = router;
