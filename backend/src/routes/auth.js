'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'yap-dev-secret-change-in-prod';
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// FIX #4 — Brute-force protection on the login endpoint.
// 10 attempts per IP per 15-minute window before a 429 is returned.
// express-rate-limit operates in memory by default; swap the `store` option
// for a Redis-backed store if you scale to multiple processes.
// ---------------------------------------------------------------------------
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,  // Emit RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
  },
});

// ---------------------------------------------------------------------------
// FIX #1 — issueToken now embeds must_change_password in the JWT payload.
//
// Root cause of the broken first-run enforcement: the payload only ever
// contained { id, username, is_admin }.  authMiddleware mirrored that into
// req.user, so req.user.must_change_password was always undefined.
// firstRunMiddleware's guard (undefined === 1) was permanently false.
//
// Additionally, this function is now called after a successful password change
// so the refreshed token carries must_change_password = 0 immediately,
// rather than leaving the user's session blocked for up to 24 hours.
// ---------------------------------------------------------------------------
function issueToken(res, user) {
  const payload = {
    id: user.id,
    username: user.username,
    is_admin: user.is_admin,
    must_change_password: user.must_change_password, // FIX #1
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
// FIX #4: loginRateLimiter is the first middleware in the chain.
// FIX #5: async handler — bcrypt.compare releases the event loop between
//         hash rounds instead of blocking it for ~200 ms per call.
// ---------------------------------------------------------------------------
router.post('/login', loginRateLimiter, async (req, res, next) => {
  try {
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
      // FIX #5: async constant-time dummy compare — prevents user enumeration
      // while keeping the event loop free during the bcrypt work.
      await bcrypt.compare('dummy', '$2b$12$uGqvOB0fOkH1ZZ1xdjQwOe8JrIoYNewc19hXtOD87mpy4V/mQJuAe');
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    // FIX #5: was bcrypt.compareSync — now non-blocking
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
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
  } catch (err) {
    next(err);
  }
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
// FIX #5: async handler — all bcrypt calls are now non-blocking.
// FIX #1: issueToken is called after the update so the fresh JWT carries
//         must_change_password = 0, unblocking the user immediately.
// ---------------------------------------------------------------------------
router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
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

    // FIX #5: was bcrypt.compareSync
    const passwordMatch = await bcrypt.compare(old_password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Old password is incorrect' });
    }

    // FIX #5: was bcrypt.hashSync
    const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    db.prepare(
      'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?'
    ).run(newHash, req.user.id);

    // FIX #1: Re-issue the cookie with must_change_password = 0 so that
    // firstRunMiddleware releases the user on the very next request.
    issueToken(res, { ...user, must_change_password: 0 });

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
