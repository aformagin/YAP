import client from './client.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

/**
 * Fetch all videos from the library.
 * @returns {Promise} axios response with array of { id, filename, path, format, added_at }
 */
export function getVideos() {
  return client.get('/api/videos');
}

/**
 * Trigger a video library scan (admin only).
 * @param {string} directory  Absolute path to the video directory on the server.
 * @returns {Promise}
 */
export function scanVideos(directory) {
  return client.post('/api/videos/scan', { directory });
}

/**
 * Get the current status of the video scanner.
 * Returns: { scanning: bool, totalFiles: number, processedFiles: number }
 */
export function getVideoScanStatus() {
  return client.get('/api/videos/scan/status');
}

/**
 * Build the streaming URL for a video by its ID.
 * @param {number} id
 * @returns {string}
 */
export function getVideoStreamUrl(id) {
  return `${BASE_URL}/api/videos/${id}/stream`;
}
