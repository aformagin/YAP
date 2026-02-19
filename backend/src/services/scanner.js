'use strict';

const fs = require('fs');
const path = require('path');
const { parseFile } = require('music-metadata');
const db = require('../db');
const scraper = require('./scraper');

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.flac', '.ogg', '.m4a', '.wav']);

// Shared scan state — accessible from the scan route for status reporting
const scanState = {
  scanning: false,
  totalFiles: 0,
  processedFiles: 0,
};

/**
 * Recursively collect all audio file paths under `dir`.
 * Uses async fs.promises.readdir for non-blocking I/O.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectAudioFiles(dir) {
  const results = [];

  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(`[Scanner] Cannot read directory "${dir}": ${err.message}`);
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const nested = await collectAudioFiles(fullPath);
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
 * Extract metadata from a single audio file using music-metadata.
 * @param {string} filePath
 * @returns {Promise<object|null>}
 */
async function extractMetadata(filePath) {
  try {
    const metadata = await parseFile(filePath, { duration: true });
    const { common, format } = metadata;

    return {
      title: common.title || path.basename(filePath, path.extname(filePath)),
      artist: common.artist || common.albumartist || null,
      album: common.album || null,
      genre: (common.genre && common.genre[0]) || null,
      duration: format.duration ? Math.round(format.duration) : null,
      bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : null, // kbps
      format: format.container ? format.container.toLowerCase() : path.extname(filePath).slice(1).toLowerCase(),
    };
  } catch (err) {
    console.warn(`[Scanner] Metadata parse failed for "${filePath}": ${err.message}`);
    return null;
  }
}

/**
 * Insert or ignore a media row into the DB.
 * Returns the id of the inserted or existing row.
 * @param {string} filePath
 * @param {object} meta
 * @returns {number|null} media row id
 */
function upsertMedia(filePath, meta) {
  // INSERT OR IGNORE means if file_path already exists, the row is unchanged
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO media (title, artist, album, genre, duration, file_path, bitrate, format)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    meta.title,
    meta.artist,
    meta.album,
    meta.genre,
    meta.duration,
    filePath,
    meta.bitrate,
    meta.format
  );

  const row = db.prepare('SELECT id, cover_path FROM media WHERE file_path = ?').get(filePath);
  return row || null;
}

/**
 * Run a full scan of the given directory.
 * This function is designed to be called asynchronously (fire-and-forget).
 *
 * @param {string} directory - Absolute, pre-validated directory path
 */
async function runScan(directory) {
  if (scanState.scanning) {
    console.log('[Scanner] Scan already in progress, ignoring duplicate request');
    return;
  }

  scanState.scanning = true;
  scanState.totalFiles = 0;
  scanState.processedFiles = 0;

  console.log(`[Scanner] Starting scan of: ${directory}`);

  try {
    const files = await collectAudioFiles(directory);
    scanState.totalFiles = files.length;
    console.log(`[Scanner] Found ${files.length} audio file(s)`);

    for (const filePath of files) {
      const meta = await extractMetadata(filePath);

      if (meta) {
        const row = upsertMedia(filePath, meta);
        const { value: scrape } = db.prepare('SELECT value FROM settings WHERE key = ?').get('scanner.scrape_covers');

        // Attempt cover art fetch if artist + album are known and scraping is enabled
        if (scrape === 'true' && row && meta.artist && meta.album && !row.cover_path) {
          // Do not await — fire-and-forget to keep scan responsive
          await scraper.fetchCoverArt(meta.artist, meta.album, row.id);
        }
      }

      scanState.processedFiles += 1;
    }

    console.log(`[Scanner] Scan complete. Processed ${scanState.processedFiles}/${scanState.totalFiles} file(s)`);
  } catch (err) {
    console.error(`[Scanner] Scan error: ${err.message}`);
  } finally {
    scanState.scanning = false;
  }
}

module.exports = { runScan, scanState };
