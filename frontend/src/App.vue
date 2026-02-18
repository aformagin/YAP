<template>
  <div id="app">
    <NavBar v-if="auth.isAuthenticated" />

    <main
      class="main-content"
      :class="{
        'with-nav': auth.isAuthenticated,
        'with-player': auth.isAuthenticated && currentTrack.track,
      }"
    >
      <RouterView v-slot="{ Component, route }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>

    <AudioPlayer v-if="auth.isAuthenticated && currentTrack.track" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useUserAuthStore } from './stores/userAuth.js';
import { useCurrentTrackStore } from './stores/currentTrack.js';
import { useThemeStore } from './stores/theme.js';
import NavBar from './components/NavBar.vue';
import AudioPlayer from './components/AudioPlayer.vue';

const auth = useUserAuthStore();
const currentTrack = useCurrentTrackStore();
const theme = useThemeStore();

onMounted(async () => {
  // Initialize the HTMLAudioElement early so it exists in a user-gesture context.
  // (Some browsers require audio to be set up after a user interaction, but
  // creating the element here is still best practice for LAN apps.)
  currentTrack.init();

  // Attempt to restore the session without redirecting — the router guard
  // will redirect to /login if this fails.
  if (!auth.isAuthenticated) {
    try {
      await auth.fetchMe();
      // Apply the user's saved theme preference
      theme.initFromUser(auth.user);
    } catch {
      // Not authenticated — fetchMe threw (401). The router guard handles redirect.
      // Apply OS preference as default for the login page.
      theme.initFromUser(null);
    }
  }
});
</script>

<style scoped>
/* Page transition */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
