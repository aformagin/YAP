'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Map of file extensions to MIME types
const MIME_TYPES = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
};

// ---------------------------------------------------------------------------
// GET /api/stream/:id  (authenticated)
// HTTP 206 Partial Content streaming for audio files
// ---------------------------------------------------------------------------
router.get('/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'BadRequest', message: 'Invalid track ID' });
  }

  const track = db.prepare('SELECT file_path, format FROM media WHERE id = ?').get(id);
  if (!track) {
    return res.status(404).json({ error: 'NotFound', message: 'Track not found' });
  }

  const filePath = track.file_path;

  // Ensure the file still exists on disk
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'NotFound', message: 'Audio file missing from disk' });
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (err) {
    return res.status(500).json({ error: 'InternalError', message: 'Could not stat audio file' });
  }

  const fileSize = stat.size;
  const contentType = MIME_TYPES[track.format] || 'audio/mpeg';
  const range = req.headers.range;

  if (range) {
    // Parse the Range header: "bytes=start-end"
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Validate range values
    if (
      isNaN(start) ||
      isNaN(end) ||
      start < 0 ||
      end >= fileSize ||
      start > end
    ) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).json({ error: 'RangeNotSatisfiable', message: 'Invalid range' });
    }

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('error', (err) => {
      console.error('[Stream] Read error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'InternalError', message: 'Stream error' });
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  } else {
    // Full file response
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('[Stream] Read error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'InternalError', message: 'Stream error' });
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  }
});

module.exports = router;
