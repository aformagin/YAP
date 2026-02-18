import client from './client.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

/**
 * Fetch all media tracks, optionally filtered by a search term.
 * Returns an array of track objects: { id, title, artist, album, genre, duration, cover_path }
 */
export function getMedia(search = '') {
  const params = search ? { search } : {};
  return client.get('/api/media', { params });
}

/**
 * Build a full URL for a cover image path returned by the backend.
 * If no cover path is provided, returns null (caller should show placeholder).
 */
export function getCoverUrl(coverPath) {
  if (!coverPath) return null;
  // If the backend already returns a full URL, use it as-is
  if (coverPath.startsWith('http')) return coverPath;
  // cover_path is a bare filename (e.g. "artist-album.jpg") — prepend the covers API route
  const filename = coverPath.replace(/^\/+/, '');
  return `${BASE_URL}/api/covers/${filename}`;
}

/**
 * Build the streaming URL for a track by its ID.
 */
export function getStreamUrl(trackId) {
  return `${BASE_URL}/api/stream/${trackId}`;
}
