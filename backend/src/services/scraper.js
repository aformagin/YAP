'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('../db');

const COVERS_DIR = process.env.COVERS_DIR || path.resolve(__dirname, '..', '..', '.cache', 'covers');
const MUSICBRAINZ_TIMEOUT_MS = 5000;
const CONNECTIVITY_TIMEOUT_MS = 3000;

// Module-level connectivity cache to avoid hammering the connectivity check
let _cachedOnline = false;
let _lastConnectivityCheck = -Infinity; // Force a real check on first call
const CONNECTIVITY_CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Sanitize a string for use in filenames.
 * Replaces non-alphanumeric characters (except hyphens) with underscores.
 */
function sanitizeForFilename(str) {
  if (!str) return 'unknown';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Check internet connectivity by attempting a HEAD request to MusicBrainz.
 * Result is cached for CONNECTIVITY_CACHE_TTL_MS to reduce overhead.
 * @returns {Promise<boolean>}
 */
async function isOnline() {
  const now = Date.now();
  if (now - _lastConnectivityCheck < CONNECTIVITY_CACHE_TTL_MS) {
    return _cachedOnline;
  }

  try {
    await axios.head('https://musicbrainz.org', {
      timeout: CONNECTIVITY_TIMEOUT_MS,
      headers: { 'User-Agent': 'YAP-MusicServer/1.0 (local-dev)' },
    });
    _cachedOnline = true;
  } catch {
    _cachedOnline = false;
  }

  _lastConnectivityCheck = now;
  return _cachedOnline;
}

/**
 * Fetch cover art for a given artist+album combination from MusicBrainz
 * and the Cover Art Archive, saving it to .cache/covers/.
 *
 * @param {string} artist
 * @param {string} album
 * @param {number} mediaId  - DB row id in media table to update cover_path
 */
async function fetchCoverArt(artist, album, mediaId) {
  if (!artist || !album) return;

  const online = await isOnline();
  if (!online) return;

  const sanitizedArtist = sanitizeForFilename(artist);
  const sanitizedAlbum = sanitizeForFilename(album);
  const coverFilename = `${sanitizedArtist}-${sanitizedAlbum}.jpg`;
  const coverPath = path.join(COVERS_DIR, coverFilename);

  // Skip if already cached
  if (fs.existsSync(coverPath)) {
    // Update DB if the cover_path is not set yet
    const row = db.prepare('SELECT cover_path FROM media WHERE id = ?').get(mediaId);
    if (row && !row.cover_path) {
      db.prepare('UPDATE media SET cover_path = ? WHERE id = ?').run(coverFilename, mediaId);
    }
    return;
  }

  try {
    // Step 1: Search MusicBrainz for the release-group
    const searchUrl = 'https://musicbrainz.org/ws/2/release-group';
    const searchParams = {
      query: `artist:"${artist}" release:"${album}"`,
      fmt: 'json',
      limit: 1,
    };

    const searchResp = await axios.get(searchUrl, {
      params: searchParams,
      timeout: MUSICBRAINZ_TIMEOUT_MS,
      headers: {
        'User-Agent': 'YAP-MusicServer/1.0 (local-dev)',
        'Accept': 'application/json',
      },
    });

    const releaseGroups = searchResp.data['release-groups'];
    if (!releaseGroups || releaseGroups.length === 0) return;

    const mbid = releaseGroups[0].id;
    if (!mbid) return;

    // Step 2: Fetch cover art from Cover Art Archive
    const coverUrl = `https://coverartarchive.org/release-group/${mbid}/front`;

    const coverResp = await axios.get(coverUrl, {
      timeout: MUSICBRAINZ_TIMEOUT_MS,
      responseType: 'stream',
      headers: { 'User-Agent': 'YAP-MusicServer/1.0 (local-dev)' },
      // CAA redirects, follow them
      maxRedirects: 5,
    });

    // Step 3: Save the image to disk
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(coverPath);
      coverResp.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Step 4: Update media row with cover_path
    db.prepare('UPDATE media SET cover_path = ? WHERE id = ?').run(coverFilename, mediaId);
    console.log(`[Scraper] Cover saved: ${coverFilename}`);
  } catch (err) {
    // Many albums won't have covers — fail silently
    if (err.response && err.response.status === 404) {
      // Normal — no cover art available
    } else {
      console.warn(`[Scraper] Failed to fetch cover for "${artist} - ${album}": ${err.message}`);
    }

    // Clean up a partial write if it exists
    if (fs.existsSync(coverPath)) {
      try { fs.unlinkSync(coverPath); } catch { /* ignore */ }
    }
  }
}

module.exports = { isOnline, fetchCoverArt };
