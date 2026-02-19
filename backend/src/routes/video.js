'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { scanVideoLibrary, getAllVideos, getVideoById, getVideoStream, scanState } = require('../services/videoService');

const router = express.Router();

const MIME_TYPES = {
  mp4:  'video/mp4',
  webm: 'video/webm',
  ogg:  'video/ogg',
  mkv:  'video/x-matroska',
  avi:  'video/x-msvideo',
  mov:  'video/quicktime',
  m4v:  'video/mp4',
};

// ---------------------------------------------------------------------------
// GET /api/videos  (authenticated)
// ---------------------------------------------------------------------------
router.get('/', authMiddleware, (req, res) => {
  const videos = getAllVideos();
  return res.status(200).json(videos);
});

// ---------------------------------------------------------------------------
// POST /api/videos/scan  (admin only)
// Body: { directory: "/absolute/path/to/videos" }
// ---------------------------------------------------------------------------
router.post('/scan', authMiddleware, adminMiddleware, (req, res) => {
  const { directory } = req.body;

  if (!directory || typeof directory !== 'string') {
    return res.status(400).json({ error: 'BadRequest', message: 'directory is required and must be a string' });
  }

  const resolvedDir = path.resolve(directory);

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
    return res.status(409).json({ error: 'Conflict', message: 'A video scan is already in progress' });
  }

  scanVideoLibrary(resolvedDir).catch((err) => {
    console.error('[VideoRoute] Unhandled scan error:', err.message);
  });

  return res.status(202).json({ message: 'Video scan started', directory: resolvedDir });
});

// ---------------------------------------------------------------------------
// GET /api/videos/scan/status  (authenticated)
// ---------------------------------------------------------------------------
router.get('/scan/status', authMiddleware, (req, res) => {
  return res.status(200).json({
    scanning: scanState.scanning,
    totalFiles: scanState.totalFiles,
    processedFiles: scanState.processedFiles,
  });
});

// ---------------------------------------------------------------------------
// GET /api/videos/:id/stream  (authenticated)
// HTTP 206 Partial Content — required for seeking in <video> elements.
// ---------------------------------------------------------------------------
router.get('/:id/stream', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'BadRequest', message: 'Invalid video ID' });
  }

  const video = getVideoById(id);
  if (!video) {
    return res.status(404).json({ error: 'NotFound', message: 'Video not found' });
  }

  const { filePath } = getVideoStream(video);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'NotFound', message: 'Video file missing from disk' });
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return res.status(500).json({ error: 'InternalError', message: 'Could not stat video file' });
  }

  const fileSize = stat.size;
  const contentType = MIME_TYPES[video.format] || 'video/mp4';
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || isNaN(end) || start < 0 || end >= fileSize || start > end) {
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
      console.error('[VideoStream] Read error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'InternalError', message: 'Stream error' });
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('[VideoStream] Read error:', err.message);
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
