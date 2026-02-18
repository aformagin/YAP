<template>
  <div class="login-page" role="main">
    <div class="login-card neu-card">
      <!-- App title -->
      <header class="login-card__header">
        <span class="login-card__logo-icon" aria-hidden="true">&#9836;</span>
        <h1 class="login-card__title">YAP</h1>
        <p class="login-card__subtitle">Yet Another Player</p>
      </header>

      <!-- Login form -->
      <form
        class="login-card__form"
        @submit.prevent="handleLogin"
        aria-label="Login form"
        novalidate
      >
        <!-- Error banner -->
        <div
          v-if="errorMessage"
          class="login-card__error"
          role="alert"
          aria-live="assertive"
        >
          {{ errorMessage }}
        </div>

        <!-- Username field -->
        <div class="form-group">
          <label for="username" class="form-label">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="neu-inset"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            required
            :disabled="isLoading"
            aria-required="true"
            aria-describedby="username-error"
            @input="clearError"
          />
          <span
            v-if="fieldErrors.username"
            id="username-error"
            class="form-field-error"
            role="alert"
          >
            {{ fieldErrors.username }}
          </span>
        </div>

        <!-- Password field -->
        <div class="form-group">
          <label for="password" class="form-label">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="neu-inset"
            autocomplete="current-password"
            required
            :disabled="isLoading"
            aria-required="true"
            aria-describedby="password-error"
            @input="clearError"
          />
          <span
            v-if="fieldErrors.password"
            id="password-error"
            class="form-field-error"
            role="alert"
          >
            {{ fieldErrors.password }}
          </span>
        </div>

        <!-- Submit -->
        <NeumorphicButton
          type="submit"
          variant="primary"
          class="login-card__submit"
          :disabled="isLoading"
          :aria-busy="isLoading"
        >
          <span v-if="isLoading" aria-hidden="true">&#8987; Logging in…</span>
          <span v-else>Log In</span>
        </NeumorphicButton>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUserAuthStore } from '../stores/userAuth.js';
import { useThemeStore } from '../stores/theme.js';
import NeumorphicButton from '../components/NeumorphicButton.vue';

const router = useRouter();
const auth = useUserAuthStore();
const theme = useThemeStore();

const username = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const fieldErrors = reactive({ username: '', password: '' });

function clearError() {
  errorMessage.value = '';
  fieldErrors.username = '';
  fieldErrors.password = '';
}

function validate() {
  let valid = true;
  if (!username.value.trim()) {
    fieldErrors.username = 'Username is required.';
    valid = false;
  }
  if (!password.value) {
    fieldErrors.password = 'Password is required.';
    valid = false;
  }
  return valid;
}

async function handleLogin() {
  clearError();
  if (!validate()) return;

  isLoading.value = true;
  try {
    const data = await auth.login(username.value.trim(), password.value);

    // Initialize theme from the returned user profile
    theme.initFromUser(data.user);

    // If the user must change their password, the router guard will redirect.
    // Otherwise push to library explicitly.
    if (auth.user?.must_change_password) {
      router.push('/change-password');
    } else {
      router.push('/library');
    }
  } catch (err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      errorMessage.value = 'Invalid username or password. Please try again.';
    } else if (status === 429) {
      errorMessage.value = 'Too many login attempts. Please wait and try again.';
    } else {
      errorMessage.value = 'Unable to connect to the server. Please try again.';
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
/* ---- Full-height centered layout ---- */
.login-page {
  align-items: center;
  background: var(--bg);
  display: flex;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  transition: background var(--transition);
}

/* ---- Card ---- */
.login-card {
  max-width: 400px;
  width: 100%;
}

/* ---- Header / branding ---- */
.login-card__header {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 2rem;
  text-align: center;
}

.login-card__logo-icon {
  color: var(--accent);
  display: block;
  font-size: 3rem;
  line-height: 1;
}

.login-card__title {
  color: var(--text);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.login-card__subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* ---- Form ---- */
.login-card__form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.form-field-error {
  color: var(--danger);
  font-size: 0.8rem;
}

/* ---- Error banner ---- */
.login-card__error {
  background: var(--danger-light);
  border-radius: 8px;
  color: var(--danger);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.75rem 1rem;
  text-align: center;
}

/* ---- Submit button ---- */
.login-card__submit {
  margin-top: 0.5rem;
  width: 100%;
}

/* Disabled state */
button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
