'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const validator = require('validator');
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// GET /api/admin/users  (admin only)
// Returns all users without password_hash.
// ---------------------------------------------------------------------------
router.get('/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = db.prepare(
    'SELECT id, username, is_admin, must_change_password, theme_preference, created_at FROM users ORDER BY id ASC'
  ).all();

  return res.status(200).json(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      is_admin: u.is_admin === 1,
      must_change_password: u.must_change_password === 1,
      theme_preference: u.theme_preference,
      created_at: u.created_at,
    }))
  );
});

// ---------------------------------------------------------------------------
// POST /api/admin/users  (admin only)
// Body: { username, password }
// Creates a new user with must_change_password = 1.
// ---------------------------------------------------------------------------
router.post('/users', authMiddleware, adminMiddleware, (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).json({ error: 'BadRequest', message: 'username and password are required' });
  }
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'BadRequest', message: 'Invalid input types' });
  }
  if (!validator.isLength(username, { min: 2, max: 64 })) {
    return res.status(400).json({ error: 'BadRequest', message: 'Username must be 2–64 characters' });
  }
  if (!validator.isAlphanumeric(username, 'en-US', { ignore: '_-' })) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'Username may only contain letters, numbers, underscores, and hyphens',
    });
  }
  if (!validator.isLength(password, { min: 8, max: 128 })) {
    return res.status(400).json({ error: 'BadRequest', message: 'Password must be 8–128 characters' });
  }

  // Check uniqueness
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Conflict', message: 'Username already taken' });
  }

  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, is_admin, must_change_password) VALUES (?, ?, 0, 1)'
  ).run(username, hash);

  const newUser = db.prepare(
    'SELECT id, username, is_admin, must_change_password, theme_preference, created_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);

  return res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    is_admin: newUser.is_admin === 1,
    must_change_password: newUser.must_change_password === 1,
    theme_preference: newUser.theme_preference,
    created_at: newUser.created_at,
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id  (admin only)
// Admins cannot delete their own account.
// ---------------------------------------------------------------------------
router.delete('/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    return res.status(400).json({ error: 'BadRequest', message: 'Invalid user ID' });
  }

  // Prevent self-deletion
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'BadRequest', message: 'You cannot delete your own account' });
  }

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!target) {
    return res.status(404).json({ error: 'NotFound', message: 'User not found' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);

  return res.status(200).json({ message: 'User deleted successfully' });
});

// ---------------------------------------------------------------------------
// GET /api/admin/settings (admin only)
// Returns all settings.
// ---------------------------------------------------------------------------
router.get('/settings', authMiddleware, adminMiddleware, (req, res) => {
  const settings = db.prepare('SELECT key, value FROM settings').all();
  const settingsObj = settings.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {});
  return res.status(200).json(settingsObj);
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/settings (admin only)
// Body: { key, value }
// ---------------------------------------------------------------------------
router.patch('/settings', authMiddleware, adminMiddleware, (req, res) => {
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ error: 'BadRequest', message: 'key and value are required' });
  }

  const setting = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
  if (!setting) {
    return res.status(404).json({ error: 'NotFound', message: `Setting '${key}' not found` });
  }

  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, key);

  return res.status(200).json({ message: 'Setting updated successfully' });
});

module.exports = router;
