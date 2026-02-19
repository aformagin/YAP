'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Absolute path to the covers cache directory — must match the scraper's COVERS_DIR
const COVERS_DIR = process.env.COVERS_DIR || path.resolve(__dirname, '..', '..', '.cache', 'covers');

// ---------------------------------------------------------------------------
// GET /api/covers/:filename
// Serves cached album art images from .cache/covers/
// No auth required — covers are referenced by opaque filenames only
// ---------------------------------------------------------------------------
router.get('/:filename', (req, res) => {
  const { filename } = req.params;

  // Only allow simple filenames — no path separators, no traversal sequences
  const safeName = path.basename(filename);
  if (safeName !== filename) {
    return res.status(400).json({ error: 'BadRequest', message: 'Invalid filename' });
  }

  // Allowlist character set: alphanumeric, hyphens, underscores, dots
  if (/[^a-zA-Z0-9\-_.]/.test(safeName)) {
    return res.status(400).json({ error: 'BadRequest', message: 'Invalid filename characters' });
  }

  const filePath = path.resolve(COVERS_DIR, safeName);

  // Final guard: ensure the resolved path is strictly inside COVERS_DIR
  const coversNormalized = COVERS_DIR.endsWith(path.sep) ? COVERS_DIR : COVERS_DIR + path.sep;
  if (!filePath.startsWith(coversNormalized)) {
    return res.status(400).json({ error: 'BadRequest', message: 'Path traversal detected' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'NotFound', message: 'Cover not found' });
  }

  // Infer MIME type from extension
  const ext = path.extname(safeName).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  const contentType = mimeMap[ext] || 'image/jpeg';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 1-day client cache
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
