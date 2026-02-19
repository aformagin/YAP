<template>
  <div class="admin-view" role="main" aria-label="Admin panel">
    <h1 class="admin-view__title">Admin Panel</h1>

    <!-- ============================================================
         SECTION 1: User Management
         ============================================================ -->
    <section class="admin-section neu-card" aria-labelledby="users-heading">
      <h2 id="users-heading" class="admin-section__title">User Management</h2>

      <!-- Loading -->
      <div v-if="usersLoading" class="admin-state" role="status" aria-live="polite">
        <div class="loading-spinner" aria-hidden="true"></div>
        Loading users…
      </div>

      <!-- Error -->
      <div v-else-if="usersError" class="admin-state admin-state--error" role="alert">
        {{ usersError }}
        <NeumorphicButton variant="default" @click="fetchUsers">Retry</NeumorphicButton>
      </div>

      <!-- Users table -->
      <div v-else class="users-table-wrap">
        <table class="users-table" aria-label="User list">
          <thead>
            <tr>
              <th scope="col">Username</th>
              <th scope="col">Role</th>
              <th scope="col">Created</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" class="users-table__row">
              <td class="users-table__username">
                {{ user.username }}
                <span v-if="user.id === auth.user?.id" class="users-table__you-badge">(you)</span>
              </td>
              <td>
                <span
                  class="role-badge"
                  :class="user.is_admin ? 'role-badge--admin' : 'role-badge--user'"
                >
                  {{ user.is_admin ? 'Admin' : 'User' }}
                </span>
              </td>
              <td class="text-secondary text-sm">
                {{ formatDate(user.created_at) }}
              </td>
              <td>
                <NeumorphicButton
                  v-if="user.id !== auth.user?.id"
                  variant="danger"
                  class="users-table__delete-btn"
                  :aria-label="`Delete user ${user.username}`"
                  @click="handleDeleteUser(user)"
                >
                  Delete
                </NeumorphicButton>
              </td>
            </tr>

            <!-- Empty state inside table -->
            <tr v-if="users.length === 0">
              <td colspan="4" class="users-table__empty text-secondary">
                No users found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add user form -->
      <div class="add-user-form">
        <h3 class="add-user-form__title">Add New User</h3>

        <div
          v-if="addUserError"
          class="admin-alert admin-alert--error"
          role="alert"
        >
          {{ addUserError }}
        </div>
        <div
          v-if="addUserSuccess"
          class="admin-alert admin-alert--success"
          role="status"
          aria-live="polite"
        >
          {{ addUserSuccess }}
        </div>

        <form
          class="add-user-form__fields"
          @submit.prevent="handleAddUser"
          novalidate
          aria-label="Add user form"
        >
          <div class="form-group">
            <label for="new-username" class="form-label">Username</label>
            <input
              id="new-username"
              v-model="newUser.username"
              type="text"
              class="neu-inset"
              autocomplete="off"
              autocapitalize="none"
              :disabled="addUserLoading"
              required
              aria-required="true"
            />
          </div>

          <div class="form-group">
            <label for="new-password" class="form-label">Temporary Password</label>
            <input
              id="new-password"
              v-model="newUser.password"
              type="password"
              class="neu-inset"
              autocomplete="new-password"
              :disabled="addUserLoading"
              required
              aria-required="true"
            />
            <span class="form-hint text-secondary text-xs">
              User will be required to change this on first login.
            </span>
          </div>

          <div class="add-user-form__submit">
            <NeumorphicButton
              type="submit"
              variant="primary"
              :disabled="addUserLoading"
              :aria-busy="addUserLoading"
            >
              <span v-if="addUserLoading">&#8987; Creating…</span>
              <span v-else>&#43; Add User</span>
            </NeumorphicButton>
          </div>
        </form>
      </div>
    </section>

    <!-- ============================================================
         SECTION 2: Library Scan
         ============================================================ -->
    <section class="admin-section neu-card" aria-labelledby="scan-heading">
      <h2 id="scan-heading" class="admin-section__title">Library Scan</h2>

      <!-- Online status indicator -->
      <div class="scan-status-row">
        <div class="scan-online-status">
          <span
            class="scan-status-dot"
            :class="scanStatus.isOnline ? 'scan-status-dot--online' : 'scan-status-dot--offline'"
            aria-hidden="true"
          ></span>
          <span class="text-sm">
            {{ scanStatus.isOnline ? 'Server Online' : 'Server Offline' }}
          </span>
        </div>
        <LocalModeBadge v-if="!scanStatus.isOnline" />
      </div>

      <!-- Scan progress (shown while scanning) -->
      <div
        v-if="scanStatus.scanning"
        class="scan-progress"
        role="status"
        aria-live="polite"
        :aria-label="`Scanning: ${scanStatus.current} of ${scanStatus.total} files`"
      >
        <div class="scan-progress__text">
          <span>Scanning…</span>
          <span class="font-semibold">
            {{ scanStatus.current }} / {{ scanStatus.total || '?' }} files
          </span>
        </div>
        <div class="scan-progress__bar-wrap neu-inset" aria-hidden="true">
          <div
            class="scan-progress__bar"
            :style="{ width: scanProgressPercent + '%' }"
          ></div>
        </div>
      </div>

      <!-- Scan form -->
      <form
        class="scan-form"
        @submit.prevent="handleScan"
        novalidate
        aria-label="Scan library form"
      >
        <div class="form-group">
          <label for="scan-directory" class="form-label">Music Directory Path</label>
          <input
            id="scan-directory"
            v-model="scanDirectory"
            type="text"
            class="neu-inset"
            placeholder="/path/to/music  or  C:\Music"
            autocomplete="off"
            :disabled="scanStatus.scanning || scanLoading"
            aria-required="true"
            aria-describedby="scan-dir-hint"
          />
          <span id="scan-dir-hint" class="form-hint text-secondary text-xs">
            Enter the full path to the directory containing your music files.
          </span>
        </div>

        <div
          v-if="scanError"
          class="admin-alert admin-alert--error"
          role="alert"
        >
          {{ scanError }}
        </div>

        <NeumorphicButton
          type="submit"
          variant="primary"
          :disabled="scanStatus.scanning || scanLoading || !scanDirectory.trim()"
          :aria-busy="scanStatus.scanning || scanLoading"
        >
          <span v-if="scanStatus.scanning">&#8987; Scanning…</span>
          <span v-else-if="scanLoading">Starting…</span>
          <span v-else>&#128269; Scan Library</span>
        </NeumorphicButton>
      </form>
    </section>

    <!-- ============================================================
         SECTION 3: Video Library Scan
         ============================================================ -->
    <section class="admin-section neu-card" aria-labelledby="video-scan-heading">
      <h2 id="video-scan-heading" class="admin-section__title">Video Library Scan</h2>

      <!-- Scan progress (shown while scanning) -->
      <div
        v-if="videoScanStatus.scanning"
        class="scan-progress"
        role="status"
        aria-live="polite"
        :aria-label="`Scanning: ${videoScanStatus.current} of ${videoScanStatus.total} files`"
      >
        <div class="scan-progress__text">
          <span>Scanning…</span>
          <span class="font-semibold">
            {{ videoScanStatus.current }} / {{ videoScanStatus.total || '?' }} files
          </span>
        </div>
        <div class="scan-progress__bar-wrap neu-inset" aria-hidden="true">
          <div
            class="scan-progress__bar"
            :style="{ width: videoScanProgressPercent + '%' }"
          ></div>
        </div>
      </div>

      <!-- Video scan form -->
      <form
        class="scan-form"
        @submit.prevent="handleVideoScan"
        novalidate
        aria-label="Scan video library form"
      >
        <div class="form-group">
          <label for="video-scan-directory" class="form-label">Video Directory Path</label>
          <input
            id="video-scan-directory"
            v-model="videoScanDirectory"
            type="text"
            class="neu-inset"
            placeholder="/path/to/videos  or  C:\Videos"
            autocomplete="off"
            :disabled="videoScanStatus.scanning || videoScanLoading"
            aria-required="true"
            aria-describedby="video-scan-dir-hint"
          />
          <span id="video-scan-dir-hint" class="form-hint text-secondary text-xs">
            Enter the full path to the directory containing your video files.
          </span>
        </div>

        <div
          v-if="videoScanError"
          class="admin-alert admin-alert--error"
          role="alert"
        >
          {{ videoScanError }}
        </div>

        <NeumorphicButton
          type="submit"
          variant="primary"
          :disabled="videoScanStatus.scanning || videoScanLoading || !videoScanDirectory.trim()"
          :aria-busy="videoScanStatus.scanning || videoScanLoading"
        >
          <span v-if="videoScanStatus.scanning">&#8987; Scanning…</span>
          <span v-else-if="videoScanLoading">Starting…</span>
          <span v-else>&#127916; Scan Videos</span>
        </NeumorphicButton>
      </form>
    </section>

    <!-- ============================================================
         SECTION 4: App Settings
         ============================================================ -->
    <section class="admin-section neu-card" aria-labelledby="settings-heading">
      <h2 id="settings-heading" class="admin-section__title">Settings</h2>
      <div class="form-group">
        <div class="checkbox-row">
          <input
            id="scrape-covers"
            type="checkbox"
            class="checkbox-input"
            :checked="settings['scanner.scrape_covers'] === 'true'"
            @change="updateSetting('scanner.scrape_covers', $event.target.checked.toString())"
          />
          <label for="scrape-covers" class="form-label">Scrape cover art</label>
        </div>
        <span class="form-hint text-secondary text-xs">
          When enabled, the scanner will attempt to fetch cover art from MusicBrainz.
          This will significantly slow down the scanning process.
        </span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useUserAuthStore } from '../stores/userAuth.js';
import { getAdminUsers, createUser, deleteUser, triggerScan, getScanStatus } from '../api/user.js';
import { scanVideos, getVideoScanStatus } from '../api/video.js';
import { getSettings, updateSetting as apiUpdateSetting } from '../api/admin.js';
import NeumorphicButton from '../components/NeumorphicButton.vue';
import LocalModeBadge from '../components/LocalModeBadge.vue';

const auth = useUserAuthStore();

// ---- Settings ----
const settings = reactive({});
const settingsLoading = ref(false);
const settingsError = ref('');

async function fetchSettings() {
  settingsLoading.value = true;
  settingsError.value = '';
  try {
    const res = await getSettings();
    Object.assign(settings, res.data);
  } catch (err) {
    settingsError.value = 'Failed to load settings.';
  } finally {
    settingsLoading.value = false;
  }
}

async function updateSetting(key, value) {
  try {
    await apiUpdateSetting(key, value);
  } catch (err) {
    alert('Failed to update setting.');
  }
}


// ---- User management ----
const users = ref([]);
const usersLoading = ref(false);
const usersError = ref('');
const addUserLoading = ref(false);
const addUserError = ref('');
const addUserSuccess = ref('');
const newUser = reactive({ username: '', password: '' });

async function fetchUsers() {
  usersLoading.value = true;
  usersError.value = '';
  try {
    const res = await getAdminUsers();
    users.value = Array.isArray(res.data) ? res.data : res.data.users ?? [];
  } catch (err) {
    usersError.value = err.response?.status === 403
      ? 'You do not have permission to manage users.'
      : 'Failed to load users.';
  } finally {
    usersLoading.value = false;
  }
}

async function handleAddUser() {
  addUserError.value = '';
  addUserSuccess.value = '';

  if (!newUser.username.trim()) {
    addUserError.value = 'Username is required.';
    return;
  }
  if (!newUser.password) {
    addUserError.value = 'Temporary password is required.';
    return;
  }

  addUserLoading.value = true;
  try {
    await createUser(newUser.username.trim(), newUser.password);
    addUserSuccess.value = `User "${newUser.username}" created successfully.`;
    newUser.username = '';
    newUser.password = '';
    await fetchUsers(); // Refresh list
    setTimeout(() => { addUserSuccess.value = ''; }, 3000);
  } catch (err) {
    if (err.response?.status === 409) {
      addUserError.value = 'A user with that username already exists.';
    } else {
      addUserError.value = err.response?.data?.message || 'Failed to create user.';
    }
  } finally {
    addUserLoading.value = false;
  }
}

async function handleDeleteUser(user) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${user.username}"? This cannot be undone.`
  );
  if (!confirmed) return;

  try {
    await deleteUser(user.id);
    users.value = users.value.filter((u) => u.id !== user.id);
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to delete user.');
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ---- Library scan ----
const scanDirectory = ref('');
const scanLoading = ref(false);
const scanError = ref('');
const scanStatus = reactive({
  scanning: false,
  current: 0,
  total: 0,
  isOnline: true,
});

let scanPollInterval = null;

const scanProgressPercent = computed(() => {
  if (!scanStatus.total) return 0;
  return Math.min(100, Math.round((scanStatus.current / scanStatus.total) * 100));
});

async function pollScanStatus() {
  try {
    const res = await getScanStatus();
    const data = res.data;
    scanStatus.scanning = data.scanning ?? false;
    scanStatus.current = data.processedFiles ?? 0;
    scanStatus.total = data.totalFiles ?? 0;
    scanStatus.isOnline = data.isOnline !== false; // default to online if field absent

    // Stop polling once scan is complete
    if (!scanStatus.scanning && scanPollInterval) {
      clearInterval(scanPollInterval);
      scanPollInterval = null;
    }
  } catch {
    // Network error — assume offline
    scanStatus.isOnline = false;
  }
}

async function handleScan() {
  if (!scanDirectory.value.trim()) return;
  scanError.value = '';
  scanLoading.value = true;

  try {
    await triggerScan(scanDirectory.value.trim());
    // Start polling every 2 seconds to show live progress
    scanStatus.scanning = true;
    if (scanPollInterval) clearInterval(scanPollInterval);
    scanPollInterval = setInterval(pollScanStatus, 2000);
  } catch (err) {
    scanError.value = err.response?.data?.message || 'Failed to start scan. Check the directory path.';
  } finally {
    scanLoading.value = false;
  }
}

// ---- Video library scan ----
const videoScanDirectory = ref('');
const videoScanLoading = ref(false);
const videoScanError = ref('');
const videoScanStatus = reactive({
  scanning: false,
  current: 0,
  total: 0,
});

let videoScanPollInterval = null;

const videoScanProgressPercent = computed(() => {
  if (!videoScanStatus.total) return 0;
  return Math.min(100, Math.round((videoScanStatus.current / videoScanStatus.total) * 100));
});

async function pollVideoScanStatus() {
  try {
    const res = await getVideoScanStatus();
    const data = res.data;
    videoScanStatus.scanning = data.scanning ?? false;
    videoScanStatus.current = data.processedFiles ?? 0;
    videoScanStatus.total = data.totalFiles ?? 0;

    if (!videoScanStatus.scanning && videoScanPollInterval) {
      clearInterval(videoScanPollInterval);
      videoScanPollInterval = null;
    }
  } catch {
    // Silently ignore — video scan status is non-critical
  }
}

async function handleVideoScan() {
  if (!videoScanDirectory.value.trim()) return;
  videoScanError.value = '';
  videoScanLoading.value = true;

  try {
    await scanVideos(videoScanDirectory.value.trim());
    videoScanStatus.scanning = true;
    if (videoScanPollInterval) clearInterval(videoScanPollInterval);
    videoScanPollInterval = setInterval(pollVideoScanStatus, 2000);
  } catch (err) {
    videoScanError.value = err.response?.data?.message || 'Failed to start scan. Check the directory path.';
  } finally {
    videoScanLoading.value = false;
  }
}

onMounted(() => {
  fetchUsers();
  pollScanStatus(); // Get initial status immediately
  pollVideoScanStatus();
  fetchSettings();
});

onUnmounted(() => {
  if (scanPollInterval) {
    clearInterval(scanPollInterval);
    scanPollInterval = null;
  }
  if (videoScanPollInterval) {
    clearInterval(videoScanPollInterval);
    videoScanPollInterval = null;
  }
});
</script>

<style scoped>
.admin-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
}

.admin-view__title {
  font-size: 1.5rem;
  font-weight: 700;
}

/* ---- Section ---- */
.admin-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-section__title {
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ---- States ---- */
.admin-state {
  align-items: center;
  display: flex;
  gap: 0.75rem;
}

.admin-state--error {
  color: var(--danger);
  flex-direction: column;
  align-items: flex-start;
}

/* Loading spinner */
.loading-spinner {
  animation: spin 0.8s linear infinite;
  border: 3px solid var(--accent-light);
  border-radius: 50%;
  border-top-color: var(--accent);
  flex-shrink: 0;
  height: 24px;
  width: 24px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---- Users table ---- */
.users-table-wrap {
  border-radius: 8px;
  overflow-x: auto;
}

.users-table {
  border-collapse: collapse;
  font-size: 0.9rem;
  width: 100%;
}

.users-table th,
.users-table td {
  padding: 0.625rem 0.875rem;
  text-align: left;
}

.users-table th {
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.users-table__row {
  border-radius: 8px;
  transition: background 0.12s ease;
}

.users-table__row:hover {
  background: var(--accent-light);
}

.users-table__username {
  font-weight: 500;
}

.users-table__you-badge {
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 400;
  margin-left: 0.25rem;
}

.users-table__empty {
  padding: 1.5rem;
  text-align: center;
}

.users-table__delete-btn {
  font-size: 0.8rem;
  min-height: 32px;
  padding: 0.35rem 0.75rem;
}

/* ---- Role badges ---- */
.role-badge {
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.2rem 0.6rem;
  text-transform: uppercase;
}

.role-badge--admin {
  background: var(--accent-light);
  color: var(--accent);
}

.role-badge--user {
  background: rgba(107, 114, 128, 0.12);
  color: var(--text-secondary);
}

/* ---- Add user form ---- */
.add-user-form {
  border-top: 1px solid rgba(128, 128, 128, 0.15);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1.25rem;
}

.add-user-form__title {
  font-size: 0.95rem;
  font-weight: 600;
}

.add-user-form__fields {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
}

.add-user-form__fields .form-group {
  flex: 1;
  min-width: 180px;
}

/* Push the button down to align with the inputs (clear the label + gap above) */
.add-user-form__submit {
  padding-top: calc(0.875rem * 1.5 + 0.4rem);
}

/* ---- Alerts ---- */
.admin-alert {
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.625rem 1rem;
}

.admin-alert--error {
  background: var(--danger-light);
  color: var(--danger);
}

.admin-alert--success {
  background: rgba(0, 184, 148, 0.12);
  color: var(--success);
}

/* ---- Scan section ---- */
.scan-status-row {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.scan-online-status {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.scan-status-dot {
  border-radius: 50%;
  display: inline-block;
  height: 10px;
  width: 10px;
}

.scan-status-dot--online {
  background: var(--success);
  box-shadow: 0 0 0 3px rgba(0, 184, 148, 0.2);
}

.scan-status-dot--offline {
  background: var(--danger);
  box-shadow: 0 0 0 3px rgba(225, 112, 85, 0.2);
}

/* ---- Scan progress bar ---- */
.scan-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scan-progress__text {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.scan-progress__bar-wrap {
  height: 8px;
  overflow: hidden;
  padding: 0;
  position: relative;
}

.scan-progress__bar {
  background: var(--accent);
  border-radius: 4px;
  bottom: 0;
  left: 0;
  position: absolute;
  top: 0;
  transition: width 0.4s ease;
}

/* ---- Scan form ---- */
.scan-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ---- Form helpers ---- */
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

.form-hint {
  margin-top: 0.2rem;
}

/* ---- Checkbox row ---- */
.checkbox-row {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.checkbox-input {
  accent-color: var(--accent);
  cursor: pointer;
  flex-shrink: 0;
  height: 1rem;
  width: 1rem;
}

.checkbox-row .form-label {
  cursor: pointer;
  margin: 0;
}

/* Disabled state */
button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Visually hidden */
.visually-hidden {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
</style>
