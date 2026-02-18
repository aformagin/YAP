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
        <div>
          <span class="settings-row__label">Theme</span>
          <p class="settings-row__hint text-secondary text-sm">
            Currently: <strong>{{ theme.current === 'dark' ? 'Dark' : 'Light' }}</strong>
          </p>
        </div>

        <div class="theme-toggle" role="group" aria-label="Choose theme">
          <NeumorphicButton
            variant="icon"
            class="theme-toggle__btn"
            :class="{ 'theme-toggle__btn--active': theme.current === 'light' }"
            aria-label="Light theme"
            :aria-pressed="theme.current === 'light'"
            @click="setTheme('light')"
          >
            &#9728;
          </NeumorphicButton>

          <NeumorphicButton
            variant="icon"
            class="theme-toggle__btn"
            :class="{ 'theme-toggle__btn--active': theme.current === 'dark' }"
            aria-label="Dark theme"
            :aria-pressed="theme.current === 'dark'"
            @click="setTheme('dark')"
          >
            &#9790;
          </NeumorphicButton>
        </div>
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
    themeSaveMessage.value = `Theme saved: ${value === 'dark' ? 'Dark' : 'Light'}`;
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

/* ---- Theme toggle ---- */
.theme-toggle {
  display: flex;
  gap: 0.5rem;
}

.theme-toggle__btn {
  font-size: 1.2rem;
}

.theme-toggle__btn--active {
  box-shadow: var(--shadow-inset-high), var(--shadow-inset-low);
  color: var(--accent);
}
</style>
