'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../db');

const VIDEO_DIR = process.env.VIDEO_DIR || path.resolve(__dirname, '..', '..', 'videos');

const SUPPORTED_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.avi', '.mov', '.m4v']);

// Shared scan state for status reporting
const scanState = {
  scanning: false,
  totalFiles: 0,
  processedFiles: 0,
};

/**
 * Recursively collect all video file paths under `dir`.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectVideoFiles(dir) {
  const results = [];

  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(`[VideoService] Cannot read directory "${dir}": ${err.message}`);
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const nested = await collectVideoFiles(fullPath);
      results.push(...nested);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Run a full sync of the video library:
 *   - Add new files found on disk.
 *   - Remove DB entries for files that no longer exist.
 * Fire-and-forget safe.
 */
async function scanVideoLibrary(directory) {
  if (scanState.scanning) {
    console.log('[VideoService] Scan already in progress, ignoring duplicate request');
    return;
  }

  const scanDir = directory || VIDEO_DIR;

  scanState.scanning = true;
  scanState.totalFiles = 0;
  scanState.processedFiles = 0;

  console.log(`[VideoService] Starting scan of: ${scanDir}`);

  try {
    const files = await collectVideoFiles(scanDir);
    scanState.totalFiles = files.length;
    console.log(`[VideoService] Found ${files.length} video file(s)`);

    // Upsert new files
    const insertStmt = db.prepare(
      'INSERT OR IGNORE INTO videos (filename, path, format) VALUES (?, ?, ?)'
    );
    for (const filePath of files) {
      const ext = path.extname(filePath).slice(1).toLowerCase();
      const filename = path.basename(filePath);
      insertStmt.run(filename, filePath, ext);
      scanState.processedFiles += 1;
    }

    // Remove DB entries for files no longer on disk
    const allRows = db.prepare('SELECT id, path FROM videos').all();
    const fileSet = new Set(files);
    const deleteStmt = db.prepare('DELETE FROM videos WHERE id = ?');
    for (const row of allRows) {
      if (!fileSet.has(row.path)) {
        deleteStmt.run(row.id);
        console.log(`[VideoService] Removed stale entry: ${row.path}`);
      }
    }

    console.log(`[VideoService] Scan complete. Processed ${scanState.processedFiles} file(s)`);
  } catch (err) {
    console.error(`[VideoService] Scan error: ${err.message}`);
  } finally {
    scanState.scanning = false;
  }
}

/**
 * Return all video rows, sorted by filename.
 * @returns {Array}
 */
function getAllVideos() {
  return db.prepare('SELECT id, filename, path, format, added_at FROM videos ORDER BY filename ASC').all();
}

/**
 * Return a single video row by id, or null.
 * @param {number} id
 * @returns {object|null}
 */
function getVideoById(id) {
  return db.prepare('SELECT id, filename, path, format FROM videos WHERE id = ?').get(id) || null;
}

/**
 * Resolve the stream source for a video.
 * V1: returns a descriptor for a direct fs read stream.
 * V2 (FFmpeg): swap the returned object for { type: 'process', child: ffmpegProc }
 * without changing the caller.
 *
 * @param {object} video  - Row from getVideoById()
 * @returns {{ type: 'fs', filePath: string }}
 */
function getVideoStream(video) {
  return { type: 'fs', filePath: video.path };
}

module.exports = { scanVideoLibrary, getAllVideos, getVideoById, getVideoStream, scanState };
