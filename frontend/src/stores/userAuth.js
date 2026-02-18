import { defineStore } from 'pinia';
import { login as apiLogin, logout as apiLogout, me as apiMe, changePassword as apiChangePassword } from '../api/auth.js';

export const useUserAuthStore = defineStore('userAuth', {
  state: () => ({
    /**
     * The authenticated user object, or null if not logged in.
     * Shape: { id, username, is_admin, must_change_password }
     */
    user: null,
    isAuthenticated: false,
  }),

  getters: {
    isAdmin: (state) => Boolean(state.user?.is_admin),
    mustChangePassword: (state) => Boolean(state.user?.must_change_password),
  },

  actions: {
    /**
     * Authenticate the user. On success the server sets a session cookie
     * which will be sent automatically on all subsequent requests.
     */
    async login(username, password) {
      const response = await apiLogin(username, password);
      this.user = response.data.user;
      this.isAuthenticated = true;
      return response.data;
    },

    /**
     * Destroy the session on the server and clear local state.
     */
    async logout() {
      try {
        await apiLogout();
      } finally {
        this.user = null;
        this.isAuthenticated = false;
        // Use window.location for a hard redirect to clear any cached Vue state
        window.location.href = '/login';
      }
    },

    /**
     * Fetch the currently authenticated user from the backend.
     * Called on app mount and in the navigation guard to restore session.
     * Throws if not authenticated (401), so callers can catch and redirect.
     */
    async fetchMe() {
      const response = await apiMe();
      this.user = response.data.user ?? response.data;
      this.isAuthenticated = true;
      return this.user;
    },

    /**
     * Change the user's password.
     * On success, clears the must_change_password flag so the router guard
     * allows navigation to the rest of the app.
     */
    async changePassword(oldPassword, newPassword) {
      await apiChangePassword(oldPassword, newPassword);
      if (this.user) {
        this.user = { ...this.user, must_change_password: 0 };
      }
    },
  },
});
