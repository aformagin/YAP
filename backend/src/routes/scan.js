'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { runScan, scanState } = require('../services/scanner');
const scraper = require('../services/scraper');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/scan  (admin only)
// Body: { directory: "/absolute/path/to/music" }
// Triggers a background scan; returns 202 immediately.
// ---------------------------------------------------------------------------
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  const { directory } = req.body;

  if (!directory || typeof directory !== 'string') {
    return res.status(400).json({ error: 'BadRequest', message: 'directory is required and must be a string' });
  }

  // Resolve to an absolute path and verify it exists on the filesystem
  const resolvedDir = path.resolve(directory);

  // Guard: must be an existing directory
  let stat;
  try {
    stat = fs.statSync(resolvedDir);
  } catch {
    return res.status(400).json({ error: 'BadRequest', message: 'Directory does not exist or is not accessible' });
  }

  if (!stat.isDirectory()) {
    return res.status(400).json({ error: 'BadRequest', message: 'Path is not a directory' });
  }

  if (scanState.scanning) {
    return res.status(409).json({ error: 'Conflict', message: 'A scan is already in progress' });
  }

  // Fire-and-forget — intentionally not awaited
  runScan(resolvedDir).catch((err) => {
    console.error('[ScanRoute] Unhandled scan error:', err.message);
  });

  return res.status(202).json({
    message: 'Scan started',
    directory: resolvedDir,
  });
});

// ---------------------------------------------------------------------------
// GET /api/scan/status
// Returns current scan state and connectivity info.
// ---------------------------------------------------------------------------
router.get('/status', authMiddleware, async (req, res) => {
  let online = false;
  try {
    online = await scraper.isOnline();
  } catch {
    online = false;
  }

  return res.status(200).json({
    scanning: scanState.scanning,
    totalFiles: scanState.totalFiles,
    processedFiles: scanState.processedFiles,
    isOnline: online,
  });
});

module.exports = router;
