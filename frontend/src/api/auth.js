import client from './client.js';

/**
 * Authenticate a user with username and password.
 * Returns the session cookie via Set-Cookie (handled by browser automatically).
 */
export function login(username, password) {
  return client.post('/api/auth/login', { username, password });
}

/**
 * Destroy the current session on the server.
 */
export function logout() {
  return client.post('/api/auth/logout');
}

/**
 * Fetch the currently authenticated user's profile.
 * Used to restore session state on page refresh.
 */
export function me() {
  return client.get('/api/auth/me');
}

/**
 * Change the authenticated user's password.
 * Used both for forced password change (must_change_password) and voluntary changes.
 */
export function changePassword(oldPassword, newPassword) {
  return client.post('/api/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  });
}
