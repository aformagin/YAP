<template>
  <div class="video-library" role="main" aria-label="Video library">
    <!-- Toolbar: track count only -->
    <div class="video-library__toolbar">
      <span class="video-library__count text-secondary text-sm" aria-live="polite">
        {{ store.videos.length }} {{ store.videos.length === 1 ? 'video' : 'videos' }}
      </span>
    </div>

    <!-- Loading state -->
    <div v-if="store.isLoading" class="video-library__state" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <span>Loading video library…</span>
    </div>

    <!-- Error state -->
    <div v-else-if="store.error" class="video-library__state video-library__state--error" role="alert">
      <span aria-hidden="true">&#9888;</span>
      <p>{{ store.error }}</p>
      <NeumorphicButton variant="default" @click="store.fetchVideos()">Retry</NeumorphicButton>
    </div>

    <!-- Empty state -->
    <div v-else-if="store.videos.length === 0" class="video-library__state" role="status">
      <span class="video-library__empty-icon" aria-hidden="true">&#127916;</span>
      <p>No videos found.</p>
      <p class="text-secondary text-sm">Ask an admin to scan the video directory from the Admin panel.</p>
    </div>

    <!-- Video list -->
    <ul v-else class="video-library__list" role="list" aria-label="Video files">
      <li
        v-for="video in store.videos"
        :key="video.id"
        class="video-library__item"
        role="listitem"
        tabindex="0"
        :aria-label="`Play ${video.filename}`"
        @click="openModal(video)"
        @keydown.enter="openModal(video)"
        @keydown.space.prevent="openModal(video)"
      >
        <span class="video-library__item-icon" aria-hidden="true">&#127916;</span>
        <span class="video-library__item-name">{{ video.filename }}</span>
        <span class="video-library__item-format">{{ video.format?.toUpperCase() }}</span>
        <span class="video-library__item-play" aria-hidden="true">&#9654;</span>
      </li>
    </ul>

    <!-- Video player modal (teleported to <body> so it overlays navbar too) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="modalVideo"
          class="video-modal__backdrop"
          role="dialog"
          aria-modal="true"
          :aria-label="`Playing ${modalVideo.filename}`"
          @click.self="closeModal"
        >
          <div class="video-modal__box">
            <div class="video-modal__header">
              <span class="video-modal__title">{{ modalVideo.filename }}</span>
              <button
                class="video-modal__close"
                aria-label="Close video player"
                @click="closeModal"
              >
                &#10005;
              </button>
            </div>
            <video
              :key="modalVideo.id"
              :src="getVideoStreamUrl(modalVideo.id)"
              :type="mimeType(modalVideo.format)"
              class="video-modal__player"
              controls
              autoplay
            >
              Your browser does not support HTML5 video.
            </video>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useVideoStore } from '../stores/videoStore.js';
import { getVideoStreamUrl } from '../api/video.js';
import NeumorphicButton from '../components/NeumorphicButton.vue';

const store = useVideoStore();

const modalVideo = ref(null);

const MIME_MAP = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogg: 'video/ogg',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  m4v: 'video/mp4',
};

function mimeType(format) {
  return MIME_MAP[format?.toLowerCase()] || 'video/mp4';
}

function openModal(video) {
  modalVideo.value = video;
}

function closeModal() {
  modalVideo.value = null;
}

function handleKeydown(e) {
  if (e.key === 'Escape' && modalVideo.value) closeModal();
}

onMounted(() => {
  store.fetchVideos();
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.video-library {
  padding-bottom: 1rem;
}

/* ---- Toolbar ---- */
.video-library__toolbar {
  align-items: center;
  display: flex;
  margin-bottom: 1.5rem;
}

/* ---- States ---- */
.video-library__state {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 4rem 1rem;
  text-align: center;
}

.video-library__state--error {
  color: var(--danger);
}

.video-library__empty-icon {
  color: var(--accent);
  font-size: 3rem;
  opacity: 0.4;
}

/* Loading spinner */
.loading-spinner {
  animation: spin 0.8s linear infinite;
  border: 3px solid var(--accent-light);
  border-radius: 50%;
  border-top-color: var(--accent);
  height: 36px;
  width: 36px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---- Video list ---- */
.video-library__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
}

.video-library__item {
  align-items: center;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-high), var(--shadow-low);
  cursor: pointer;
  display: flex;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  transition: box-shadow 0.15s ease, transform 0.1s ease;
}

.video-library__item:hover {
  transform: translateX(2px);
}

.video-library__item:focus-visible {
  box-shadow: 0 0 0 3px var(--accent);
  outline: none;
}

.video-library__item-icon {
  flex-shrink: 0;
  font-size: 1.25rem;
}

.video-library__item-name {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-library__item-format {
  background: var(--accent-light);
  border-radius: 4px;
  color: var(--accent);
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.4rem;
}

.video-library__item-play {
  color: var(--text-secondary);
  flex-shrink: 0;
  font-size: 0.875rem;
}

@media (max-width: 600px) {
  .video-library__item-format {
    display: none;
  }
}

/* ---- Modal backdrop ---- */
.video-modal__backdrop {
  align-items: center;
  background: rgba(0, 0, 0, 0.72);
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  padding: 0.75rem 1rem;
  position: fixed;
  right: 0;
  top: 64px; /* sit below the fixed navbar */
  z-index: 300;
}

/* ---- Modal box ---- */
.video-modal__box {
  background: var(--bg);
  border-radius: var(--border-radius);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px - 1.5rem); /* fill space below navbar minus padding */
  max-width: 1400px;
  overflow: hidden;
  width: 100%;
}

.video-modal__header {
  align-items: center;
  background: var(--accent-light);
  display: flex;
  flex-shrink: 0;
  gap: 0.75rem;
  justify-content: space-between;
  padding: 0.75rem 1rem;
}

.video-modal__title {
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-modal__close {
  background: none;
  border: none;
  border-radius: 50%;
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  font-size: 0.875rem;
  height: 30px;
  line-height: 1;
  padding: 0;
  transition: color 0.15s ease;
  width: 30px;
}

.video-modal__close:hover {
  color: var(--danger);
}

.video-modal__close:focus-visible {
  box-shadow: 0 0 0 2px var(--accent);
  outline: none;
}

.video-modal__player {
  background: #000;
  display: block;
  flex: 1;
  min-height: 0; /* allows flex child to shrink below natural size */
  width: 100%;
}

/* ---- Modal transition ---- */
.modal-fade-enter-active {
  transition: opacity 0.2s ease;
}

.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .video-modal__box {
  transition: transform 0.2s ease;
}

.modal-fade-leave-active .video-modal__box {
  transition: transform 0.15s ease;
}

.modal-fade-enter-from .video-modal__box,
.modal-fade-leave-to .video-modal__box {
  transform: scale(0.95);
}
</style>
