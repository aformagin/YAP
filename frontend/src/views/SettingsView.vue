<template>
  <div class="settings-view" role="main" aria-label="Settings">
    <h1 class="settings-view__title">Settings</h1>

    <!-- Account section -->
    <section class="settings-section neu-card" aria-labelledby="account-heading">
      <h2 id="account-heading" class="settings-section__title">Account</h2>

      <div class="settings-row">
        <span class="settings-row__label">Signed in as</span>
        <span class="settings-row__value">
          <strong>{{ auth.user?.username }}</strong>
          <span v-if="auth.isAdmin" class="settings-badge">Admin</span>
        </span>
      </div>

      <div class="settings-row">
        <span class="settings-row__label">Change Password</span>
        <NeumorphicButton variant="default" @click="router.push('/change-password')">
          Change Password
        </NeumorphicButton>
      </div>
    </section>

    <!-- Theme section -->
    <section class="settings-section neu-card" aria-labelledby="theme-heading">
      <h2 id="theme-heading" class="settings-section__title">Appearance</h2>

      <div class="settings-row">
        <label for="theme-select" class="settings-row__label">Theme</label>

        <select
          id="theme-select"
          class="theme-select neu-inset"
          :value="theme.current"
          @change="setTheme($event.target.value)"
          aria-label="Choose theme"
        >
          <option value="dark">YAP Dark</option>
          <option value="light">YAP Light</option>
          <option value="spotify">YAPify</option>
        </select>
      </div>

      <!-- Success feedback -->
      <p
        v-if="themeSaveMessage"
        class="settings-section__feedback"
        role="status"
        aria-live="polite"
      >
        {{ themeSaveMessage }}
      </p>
    </section>

    <!-- About section -->
    <section class="settings-section neu-card" aria-labelledby="about-heading">
      <h2 id="about-heading" class="settings-section__title">About</h2>
      <div class="settings-row">
        <span class="settings-row__label">YAP</span>
        <span class="settings-row__value text-secondary">
          Yet Another Player &mdash; LAN-first music server
        </span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserAuthStore } from '../stores/userAuth.js';
import { useThemeStore } from '../stores/theme.js';
import NeumorphicButton from '../components/NeumorphicButton.vue';
const router = useRouter();
const auth = useUserAuthStore();
const theme = useThemeStore();

const themeSaveMessage = ref('');
let themeFeedbackTimeout = null;

async function setTheme(value) {
  if (theme.current === value) return;

  try {
    await theme.save(value);
    const THEME_LABELS = { dark: 'YAP Dark', light: 'YAP Light', spotify: 'YAPify' };
    themeSaveMessage.value = `Theme saved: ${THEME_LABELS[value] ?? value}`;
  } catch {
    // Theme is applied visually even if save fails
    themeSaveMessage.value = 'Theme applied (could not save to server).';
  }

  // Clear the feedback message after 2.5 seconds
  clearTimeout(themeFeedbackTimeout);
  themeFeedbackTimeout = setTimeout(() => {
    themeSaveMessage.value = '';
  }, 2500);
}
</script>

<style scoped>
.settings-view {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-view__title {
  font-size: 1.5rem;
  font-weight: 700;
}

/* ---- Section ---- */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.settings-section__title {
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.settings-section__feedback {
  color: var(--success);
  font-size: 0.875rem;
  font-weight: 500;
}

/* ---- Row ---- */
.settings-row {
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  flex-wrap: wrap;
}

.settings-row__label {
  color: var(--text);
  font-weight: 500;
}

.settings-row__value {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.settings-row__hint {
  margin-top: 0.2rem;
}

/* ---- Admin badge ---- */
.settings-badge {
  background: var(--accent-light);
  border-radius: 12px;
  color: var(--accent);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.6rem;
  text-transform: uppercase;
}

/* ---- Theme select ---- */
.theme-select {
  appearance: none;
  background-color: var(--bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  border: none;
  border-radius: var(--border-radius);
  color: var(--text);
  cursor: pointer;
  font-size: 0.9rem;
  font-family: inherit;
  min-width: 10rem;
  padding: 0.5rem 2.25rem 0.5rem 0.875rem;
}

.theme-select option {
  background-color: var(--bg);
  color: var(--text);
}

.theme-select:focus-visible {
  box-shadow: 0 0 0 2px var(--accent);
  outline: none;
}
</style>
