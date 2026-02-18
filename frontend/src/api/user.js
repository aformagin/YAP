import client from './client.js';

/**
 * Update user-level settings (e.g. theme preference).
 * Payload: { theme_preference: 'light' | 'dark' }
 */
export function updateSettings(settings) {
  return client.patch('/api/user/settings', settings);
}

/**
 * Fetch all users — admin only.
 * Returns: [{ id, username, is_admin, must_change_password, created_at }]
 */
export function getAdminUsers() {
  return client.get('/api/admin/users');
}

/**
 * Create a new user — admin only.
 * The user will be required to change their password on first login.
 */
export function createUser(username, password) {
  return client.post('/api/admin/users', { username, password });
}

/**
 * Delete a user by their ID — admin only.
 */
export function deleteUser(id) {
  return client.delete(`/api/admin/users/${id}`);
}

/**
 * Trigger a background media library scan of the given directory path.
 */
export function triggerScan(directory) {
  return client.post('/api/scan', { directory });
}

/**
 * Get the current status of the media scanner.
 * Returns: { scanning: bool, current: number, total: number, isOnline: bool }
 */
export function getScanStatus() {
  return client.get('/api/scan/status');
}
