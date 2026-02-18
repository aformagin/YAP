<template>
  <header class="navbar" role="banner">
    <nav class="navbar__inner" aria-label="Main navigation">
      <!-- Logo -->
      <RouterLink to="/library" class="navbar__logo" aria-label="YAP Home">
        <span class="navbar__logo-icon" aria-hidden="true">&#9836;</span>
        <span class="navbar__logo-text">YAP</span>
      </RouterLink>

      <!-- Desktop nav links -->
      <ul class="navbar__links" role="list">
        <li>
          <RouterLink to="/library" class="navbar__link" active-class="navbar__link--active">
            Library
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/queue" class="navbar__link" active-class="navbar__link--active">
            Queue
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/settings" class="navbar__link" active-class="navbar__link--active">
            Settings
          </RouterLink>
        </li>
        <li v-if="auth.isAdmin">
          <RouterLink to="/admin" class="navbar__link" active-class="navbar__link--active">
            Admin
          </RouterLink>
        </li>
      </ul>

      <!-- Right side: badges + logout -->
      <div class="navbar__right">
        <LocalModeBadge v-if="isOffline" />
        <NeumorphicButton variant="default" class="navbar__logout-btn" @click="handleLogout">
          Logout
        </NeumorphicButton>

        <!-- Mobile hamburger -->
        <button
          class="navbar__hamburger"
          :class="{ 'navbar__hamburger--open': mobileOpen }"
          aria-label="Open navigation menu"
          :aria-expanded="mobileOpen"
          aria-controls="mobile-nav"
          @click="toggleMobile"
        >
          <span class="hamburger-line" />
          <span class="hamburger-line" />
          <span class="hamburger-line" />
        </button>
      </div>
    </nav>

    <!-- Mobile slide-out panel -->
    <Transition name="slide-fade">
      <div
        v-if="mobileOpen"
        id="mobile-nav"
        class="navbar__mobile-panel"
        role="dialog"
        aria-label="Mobile navigation"
        aria-modal="true"
      >
        <ul class="navbar__mobile-links" role="list">
          <li>
            <RouterLink
              to="/library"
              class="navbar__mobile-link"
              active-class="navbar__mobile-link--active"
              @click="closeMobile"
            >
              &#127925; Library
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/queue"
              class="navbar__mobile-link"
              active-class="navbar__mobile-link--active"
              @click="closeMobile"
            >
              &#9776; Queue
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/settings"
              class="navbar__mobile-link"
              active-class="navbar__mobile-link--active"
              @click="closeMobile"
            >
              &#9881; Settings
            </RouterLink>
          </li>
          <li v-if="auth.isAdmin">
            <RouterLink
              to="/admin"
              class="navbar__mobile-link"
              active-class="navbar__mobile-link--active"
              @click="closeMobile"
            >
              &#128272; Admin
            </RouterLink>
          </li>
        </ul>

        <div class="navbar__mobile-footer">
          <LocalModeBadge v-if="isOffline" />
          <NeumorphicButton variant="danger" @click="handleLogout">
            Logout
          </NeumorphicButton>
        </div>
      </div>
    </Transition>

    <!-- Click-outside overlay for mobile panel -->
    <div
      v-if="mobileOpen"
      class="navbar__overlay"
      aria-hidden="true"
      @click="closeMobile"
    />
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useUserAuthStore } from '../stores/userAuth.js';
import { getScanStatus } from '../api/user.js';
import NeumorphicButton from './NeumorphicButton.vue';
import LocalModeBadge from './LocalModeBadge.vue';

const auth = useUserAuthStore();
const mobileOpen = ref(false);
const isOffline = ref(false);

let statusInterval = null;

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value;
}

function closeMobile() {
  mobileOpen.value = false;
}

async function handleLogout() {
  await auth.logout();
}

// Poll scan status to surface the local mode badge
async function checkOnlineStatus() {
  try {
    const res = await getScanStatus();
    isOffline.value = res.data?.isOnline === false;
  } catch {
    // Network failure — assume offline
    isOffline.value = true;
  }
}

// Close mobile menu on Escape key
function handleKeydown(e) {
  if (e.key === 'Escape' && mobileOpen.value) {
    closeMobile();
  }
}

onMounted(() => {
  checkOnlineStatus();
  statusInterval = setInterval(checkOnlineStatus, 30_000); // recheck every 30s
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  clearInterval(statusInterval);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* ---- Container ---- */
.navbar {
  background: var(--bg);
  box-shadow: var(--shadow-low);
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 100;
  transition: background var(--transition);
}

.navbar__inner {
  align-items: center;
  display: flex;
  gap: 1rem;
  height: 64px;
  margin: 0 auto;
  max-width: 1400px;
  padding: 0 1.5rem;
}

/* ---- Logo ---- */
.navbar__logo {
  align-items: center;
  color: var(--accent);
  display: flex;
  font-size: 1.25rem;
  font-weight: 700;
  gap: 0.4rem;
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.navbar__logo:hover {
  opacity: 0.8;
}

.navbar__logo-icon {
  font-size: 1.5rem;
}

/* ---- Desktop links ---- */
.navbar__links {
  align-items: center;
  display: flex;
  flex: 1;
  gap: 0.25rem;
  list-style: none;
  margin-left: 1.5rem;
}

.navbar__link {
  border-radius: 8px;
  color: var(--text-secondary);
  font-weight: 500;
  padding: 0.5rem 0.875rem;
  text-decoration: none;
  transition: color 0.15s ease, background 0.15s ease;
}

.navbar__link:hover {
  background: var(--accent-light);
  color: var(--accent);
}

.navbar__link--active {
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}

/* ---- Right side ---- */
.navbar__right {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
}

.navbar__logout-btn {
  font-size: 0.875rem;
  min-height: 36px;
  padding: 0.5rem 1rem;
}

/* ---- Hamburger ---- */
.navbar__hamburger {
  align-items: center;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: none;
  flex-direction: column;
  gap: 5px;
  height: 44px;
  justify-content: center;
  padding: 0.5rem;
  width: 44px;
}

.hamburger-line {
  background: var(--text);
  border-radius: 2px;
  display: block;
  height: 2px;
  transition: transform 0.25s ease, opacity 0.25s ease, width 0.25s ease;
  width: 22px;
}

.navbar__hamburger--open .hamburger-line:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.navbar__hamburger--open .hamburger-line:nth-child(2) {
  opacity: 0;
  width: 0;
}

.navbar__hamburger--open .hamburger-line:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* ---- Mobile panel ---- */
.navbar__mobile-panel {
  background: var(--bg);
  bottom: 0;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  left: 0;
  padding: 2rem 1.5rem;
  position: fixed;
  top: 64px;
  width: 280px;
  z-index: 200;
}

.navbar__mobile-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
}

.navbar__mobile-link {
  border-radius: 12px;
  color: var(--text);
  display: block;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 0.875rem 1rem;
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.navbar__mobile-link:hover {
  background: var(--accent-light);
  color: var(--accent);
}

.navbar__mobile-link--active {
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}

.navbar__mobile-footer {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: auto;
  padding-top: 1.5rem;
}

/* ---- Overlay ---- */
.navbar__overlay {
  background: rgba(0, 0, 0, 0.4);
  bottom: 0;
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 150;
}

/* ---- Transition animations ---- */
.slide-fade-enter-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-fade-leave-active {
  transition: transform 0.25s ease, opacity 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

/* ---- Responsive: show hamburger on mobile, hide desktop links ---- */
@media (max-width: 767px) {
  .navbar__links {
    display: none;
  }

  .navbar__logout-btn {
    display: none;
  }

  .navbar__hamburger {
    display: flex;
  }
}
</style>
