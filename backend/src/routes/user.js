'use strict';

const express = require('express');
const validator = require('validator');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const ALLOWED_THEMES = new Set(['light', 'dark']);

// ---------------------------------------------------------------------------
// PATCH /api/user/settings  (authenticated)
// Body: { theme_preference: 'light' | 'dark' }
// Updates only the requesting user's settings.
// ---------------------------------------------------------------------------
router.patch('/settings', authMiddleware, (req, res) => {
  const { theme_preference } = req.body;

  if (theme_preference === undefined) {
    return res.status(400).json({ error: 'BadRequest', message: 'No settings provided to update' });
  }

  if (typeof theme_preference !== 'string' || !ALLOWED_THEMES.has(theme_preference)) {
    return res.status(400).json({
      error: 'BadRequest',
      message: `theme_preference must be one of: ${[...ALLOWED_THEMES].join(', ')}`,
    });
  }

  db.prepare('UPDATE users SET theme_preference = ? WHERE id = ?').run(theme_preference, req.user.id);

  const updated = db.prepare(
    'SELECT id, username, is_admin, must_change_password, theme_preference FROM users WHERE id = ?'
  ).get(req.user.id);

  return res.status(200).json({
    id: updated.id,
    username: updated.username,
    is_admin: updated.is_admin === 1,
    must_change_password: updated.must_change_password === 1,
    theme_preference: updated.theme_preference,
  });
});

module.exports = router;
