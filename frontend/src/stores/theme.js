import { defineStore } from 'pinia';
import { updateSettings } from '../api/user.js';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    /** 'light' | 'dark' */
    current: 'light',
  }),

  actions: {
    /**
     * Apply a theme immediately by setting the data-theme attribute on <html>.
     * This triggers the CSS custom property swap via the [data-theme="dark"] selector.
     */
    apply(theme) {
      this.current = theme;
      document.documentElement.setAttribute('data-theme', theme);
    },

    /**
     * Apply the theme and persist the preference to the backend.
     * Used when the user explicitly changes their theme in settings.
     */
    async save(theme) {
      this.apply(theme);
      try {
        await updateSettings({ theme_preference: theme });
      } catch {
        // Silently fail — the visual state is already correct.
        // Network errors shouldn't prevent the user from using their chosen theme.
      }
    },

    /**
     * Initialize theme from a user object (called on app mount after fetchMe).
     * Falls back to system preference if no saved preference exists.
     */
    initFromUser(user) {
      const saved = user?.theme_preference;
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'spotify')) {
        this.apply(saved);
      } else {
        // Respect the OS/browser dark mode preference as default
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.apply(prefersDark ? 'dark' : 'light');
      }
    },
  },
});
