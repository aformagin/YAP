'use strict';

const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/media  (authenticated)
// Returns all media rows.
// Optional query params:
//   ?search=  — fuzzy match across title, artist, album
//   ?artist=  — exact match on artist
//   ?album=   — exact match on album
// ---------------------------------------------------------------------------
router.get('/', authMiddleware, (req, res) => {
  const { search, artist, album } = req.query;

  let query = `
    SELECT id, title, artist, album, genre, duration,
           file_path, cover_path, bitrate, format
    FROM media
    WHERE 1=1
  `;
  const params = [];

  if (search && typeof search === 'string') {
    // Escape LIKE special characters, then wrap in wildcards
    const escaped = search.replace(/[%_\\]/g, (c) => '\\' + c);
    const term = `%${escaped}%`;
    query += ` AND (
      title  LIKE ? ESCAPE '\\'
      OR artist LIKE ? ESCAPE '\\'
      OR album  LIKE ? ESCAPE '\\'
    )`;
    params.push(term, term, term);
  }

  if (artist && typeof artist === 'string') {
    query += ' AND artist = ?';
    params.push(artist);
  }

  if (album && typeof album === 'string') {
    query += ' AND album = ?';
    params.push(album);
  }

  query += ' ORDER BY artist ASC, album ASC, title ASC';

  const rows = db.prepare(query).all(...params);
  return res.status(200).json(rows);
});

module.exports = router;
