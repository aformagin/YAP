<template>
  <div class="change-pw-page" role="main">
    <div class="change-pw-card neu-card">
      <!-- Header -->
      <header class="change-pw-card__header">
        <span class="change-pw-card__icon" aria-hidden="true">&#128272;</span>
        <h1 class="change-pw-card__title">Set Your Password</h1>
        <p class="change-pw-card__notice">
          You must set a new password before continuing.
        </p>
      </header>

      <!-- Success state -->
      <div
        v-if="successMessage"
        class="change-pw__success"
        role="status"
        aria-live="polite"
      >
        {{ successMessage }}
      </div>

      <!-- Form -->
      <form
        v-else
        class="change-pw-card__form"
        @submit.prevent="handleSubmit"
        aria-label="Change password form"
        novalidate
      >
        <!-- Global error -->
        <div
          v-if="errorMessage"
          class="change-pw__error"
          role="alert"
          aria-live="assertive"
        >
          {{ errorMessage }}
        </div>

        <!-- Current password -->
        <div class="form-group">
          <label for="current-pw" class="form-label">Current Password</label>
          <input
            id="current-pw"
            v-model="currentPassword"
            type="password"
            class="neu-inset"
            autocomplete="current-password"
            required
            :disabled="isLoading"
            aria-required="true"
            aria-describedby="current-pw-error"
            @input="clearError"
          />
          <span
            v-if="fieldErrors.current"
            id="current-pw-error"
            class="form-field-error"
            role="alert"
          >
            {{ fieldErrors.current }}
          </span>
        </div>

        <!-- New password -->
        <div class="form-group">
          <label for="new-pw" class="form-label">New Password</label>
          <input
            id="new-pw"
            v-model="newPassword"
            type="password"
            class="neu-inset"
            autocomplete="new-password"
            required
            :disabled="isLoading"
            aria-required="true"
            aria-describedby="new-pw-error"
            @input="clearError"
          />
          <span
            v-if="fieldErrors.newPw"
            id="new-pw-error"
            class="form-field-error"
            role="alert"
          >
            {{ fieldErrors.newPw }}
          </span>
        </div>

        <!-- Confirm password -->
        <div class="form-group">
          <label for="confirm-pw" class="form-label">Confirm New Password</label>
          <input
            id="confirm-pw"
            v-model="confirmPassword"
            type="password"
            class="neu-inset"
            autocomplete="new-password"
            required
            :disabled="isLoading"
            aria-required="true"
            aria-describedby="confirm-pw-error"
            @input="clearError"
          />
          <span
            v-if="fieldErrors.confirm"
            id="confirm-pw-error"
            class="form-field-error"
            role="alert"
          >
            {{ fieldErrors.confirm }}
          </span>
        </div>

        <NeumorphicButton
          type="submit"
          variant="primary"
          class="change-pw-card__submit"
          :disabled="isLoading"
          :aria-busy="isLoading"
        >
          <span v-if="isLoading">&#8987; Saving…</span>
          <span v-else>Set New Password</span>
        </NeumorphicButton>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUserAuthStore } from '../stores/userAuth.js';
import NeumorphicButton from '../components/NeumorphicButton.vue';

const router = useRouter();
const auth = useUserAuthStore();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const fieldErrors = reactive({ current: '', newPw: '', confirm: '' });

function clearError() {
  errorMessage.value = '';
  fieldErrors.current = '';
  fieldErrors.newPw = '';
  fieldErrors.confirm = '';
}

function validate() {
  let valid = true;

  if (!currentPassword.value) {
    fieldErrors.current = 'Current password is required.';
    valid = false;
  }

  if (!newPassword.value) {
    fieldErrors.newPw = 'New password is required.';
    valid = false;
  } else if (newPassword.value.length < 8) {
    fieldErrors.newPw = 'New password must be at least 8 characters.';
    valid = false;
  }

  if (!confirmPassword.value) {
    fieldErrors.confirm = 'Please confirm your new password.';
    valid = false;
  } else if (newPassword.value !== confirmPassword.value) {
    fieldErrors.confirm = 'Passwords do not match.';
    valid = false;
  }

  return valid;
}

async function handleSubmit() {
  clearError();
  if (!validate()) return;

  isLoading.value = true;
  try {
    await auth.changePassword(currentPassword.value, newPassword.value);
    successMessage.value = 'Password updated! Redirecting…';
    // Brief pause so the user can read the success message
    setTimeout(() => {
      router.push('/library');
    }, 1200);
  } catch (err) {
    const status = err.response?.status;
    if (status === 401) {
      fieldErrors.current = 'Current password is incorrect.';
    } else if (status === 422) {
      errorMessage.value = err.response?.data?.message || 'Password does not meet requirements.';
    } else {
      errorMessage.value = 'Something went wrong. Please try again.';
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.change-pw-page {
  align-items: center;
  background: var(--bg);
  display: flex;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  transition: background var(--transition);
}

.change-pw-card {
  max-width: 420px;
  width: 100%;
}

.change-pw-card__header {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 2rem;
  text-align: center;
}

.change-pw-card__icon {
  color: var(--accent);
  font-size: 2.5rem;
}

.change-pw-card__title {
  font-size: 1.5rem;
  font-weight: 700;
}

.change-pw-card__notice {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
  max-width: 30ch;
  text-align: center;
}

.change-pw-card__form {
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
}

.form-field-error {
  color: var(--danger);
  font-size: 0.8rem;
}

.change-pw__error {
  background: var(--danger-light);
  border-radius: 8px;
  color: var(--danger);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.75rem 1rem;
}

.change-pw__success {
  background: rgba(0, 184, 148, 0.15);
  border-radius: 8px;
  color: var(--success);
  font-size: 0.9rem;
  font-weight: 500;
  padding: 1rem;
  text-align: center;
}

.change-pw-card__submit {
  margin-top: 0.5rem;
  width: 100%;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
