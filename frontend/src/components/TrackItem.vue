<template>
  <li
    class="track-item"
    :class="{ 'track-item--active': isActive }"
    role="listitem"
    @click="emit('play')"
    @keydown.enter="emit('play')"
    @keydown.space.prevent="emit('play')"
    tabindex="0"
    :aria-label="`Play ${safeTitle} by ${safeArtist}`"
    :aria-current="isActive ? 'true' : undefined"
  >
    <!-- Cover art -->
    <div class="track-item__cover" aria-hidden="true">
      <img
        v-if="coverUrl"
        :src="coverUrl"
        :alt="`Album art for ${safeAlbum}`"
        class="track-item__cover-img"
        loading="lazy"
        @error="onImageError"
      />
      <div v-else class="track-item__cover-placeholder">
        <span aria-hidden="true">&#9836;</span>
      </div>
    </div>

    <!-- Track metadata -->
    <div class="track-item__meta">
      <span class="track-item__title">{{ safeTitle }}</span>
      <span class="track-item__artist">{{ safeArtist }}</span>
      <span class="track-item__album">{{ safeAlbum }}</span>
    </div>

    <!-- Duration -->
    <span class="track-item__duration" aria-label="Duration">
      {{ formattedDuration }}
    </span>

    <!-- Playing indicator -->
    <div v-if="isActive" class="track-item__playing-indicator" aria-hidden="true">
      <span class="bar" />
      <span class="bar" />
      <span class="bar" />
    </div>
  </li>
</template>

<script setup>
import { computed, ref } from 'vue';
import DOMPurify from 'dompurify';
import { getCoverUrl } from '../api/media.js';

const props = defineProps({
  track: {
    type: Object,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['play']);

// --- Sanitize ALL metadata before rendering (XSS protection) ---
const safeTitle = computed(() => DOMPurify.sanitize(props.track.title || 'Unknown Title'));
const safeArtist = computed(() => DOMPurify.sanitize(props.track.artist || 'Unknown Artist'));
const safeAlbum = computed(() => DOMPurify.sanitize(props.track.album || 'Unknown Album'));

// --- Cover art with fallback ---
const imageErrored = ref(false);
const coverUrl = computed(() => {
  if (imageErrored.value) return null;
  return getCoverUrl(props.track.cover_path);
});

function onImageError() {
  imageErrored.value = true;
}

// --- Duration formatting ---
const formattedDuration = computed(() => {
  const secs = props.track.duration;
  if (!secs || isNaN(secs)) return '--:--';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
});
</script>

<style scoped>
.track-item {
  align-items: center;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  gap: 1rem;
  list-style: none;
  padding: 0.75rem 1rem;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.track-item:hover {
  background: var(--accent-light);
}

.track-item:focus-visible {
  box-shadow: 0 0 0 3px var(--accent);
  outline: none;
}

/* Active / currently playing */
.track-item--active {
  background: var(--accent-light);
  box-shadow: var(--shadow-inset-high), var(--shadow-inset-low);
}

.track-item--active .track-item__title {
  color: var(--accent);
  font-weight: 600;
}

/* --- Cover art --- */
.track-item__cover {
  border-radius: 8px;
  flex-shrink: 0;
  height: 50px;
  overflow: hidden;
  width: 50px;
}

.track-item__cover-img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.track-item__cover-placeholder {
  align-items: center;
  background: var(--accent-light);
  border-radius: 8px;
  color: var(--accent);
  display: flex;
  font-size: 1.5rem;
  height: 100%;
  justify-content: center;
  width: 100%;
}

/* --- Metadata --- */
.track-item__meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0; /* Allow text truncation */
}

.track-item__title {
  color: var(--text);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-item__artist,
.track-item__album {
  color: var(--text-secondary);
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- Duration --- */
.track-item__duration {
  color: var(--text-secondary);
  flex-shrink: 0;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

/* --- Playing animation bars --- */
.track-item__playing-indicator {
  align-items: flex-end;
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  height: 16px;
}

.bar {
  animation: bounce 0.8s ease infinite alternate;
  background: var(--accent);
  border-radius: 2px;
  display: block;
  width: 3px;
}

.bar:nth-child(2) {
  animation-delay: 0.2s;
}

.bar:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  from { height: 4px; }
  to { height: 14px; }
}
</style>
