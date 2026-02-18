<template>
  <div class="library-view" role="main" aria-label="Music library">
    <!-- Toolbar: search + view toggle -->
    <div class="library-view__toolbar">
      <div class="library-view__search-wrap">
        <label for="library-search" class="visually-hidden">Search your library</label>
        <input
          id="library-search"
          v-model="searchQuery"
          type="search"
          class="library-view__search neu-inset"
          placeholder="Search tracks, artists, albums…"
          autocomplete="off"
          aria-label="Search tracks, artists, albums"
          @input="onSearchInput"
        />
        <span class="library-view__search-icon" aria-hidden="true">&#128269;</span>
      </div>

      <!-- View mode toggle -->
      <div class="library-view__view-toggle" role="group" aria-label="View mode">
        <NeumorphicButton
          variant="icon"
          :class="{ 'view-btn--active': viewMode === 'list' }"
          aria-label="List view"
          :aria-pressed="viewMode === 'list'"
          @click="viewMode = 'list'"
        >
          &#9776;
        </NeumorphicButton>
        <NeumorphicButton
          variant="icon"
          :class="{ 'view-btn--active': viewMode === 'grid' }"
          aria-label="Grid view"
          :aria-pressed="viewMode === 'grid'"
          @click="viewMode = 'grid'"
        >
          &#9638;
        </NeumorphicButton>
      </div>

      <!-- Track count -->
      <span class="library-view__count text-secondary text-sm" aria-live="polite">
        {{ filteredTracks.length }}
        {{ filteredTracks.length === 1 ? 'track' : 'tracks' }}
      </span>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="library-view__loading" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <span>Loading library…</span>
    </div>

    <!-- Error state -->
    <div v-else-if="loadError" class="library-view__error" role="alert">
      <span aria-hidden="true">&#9888;</span>
      <p>{{ loadError }}</p>
      <NeumorphicButton variant="default" @click="fetchTracks">
        Retry
      </NeumorphicButton>
    </div>

    <!-- Grid view -->
    <div
      v-else-if="viewMode === 'grid'"
      class="library-view__grid"
      role="list"
      aria-label="Tracks in grid view"
    >
      <div
        v-if="filteredTracks.length === 0"
        class="library-view__empty"
        role="status"
      >
        <span aria-hidden="true">&#9836;</span>
        <p>No tracks found.</p>
        <p class="text-secondary text-sm">
          {{ searchQuery ? 'Try a different search term.' : 'Ask an admin to scan a music directory.' }}
        </p>
      </div>

      <div
        v-for="track in filteredTracks"
        :key="track.id"
        class="library-view__grid-item"
        :class="{ 'library-view__grid-item--active': track.id === currentTrack.track?.id }"
        role="listitem"
        tabindex="0"
        :aria-label="`Play ${track.safeTitle} by ${track.safeArtist}`"
        :aria-current="track.id === currentTrack.track?.id ? 'true' : undefined"
        @click="playTrack(track, filteredTracks.indexOf(track))"
        @keydown.enter="playTrack(track, filteredTracks.indexOf(track))"
        @keydown.space.prevent="playTrack(track, filteredTracks.indexOf(track))"
      >
        <div class="grid-item__cover">
          <img
            v-if="track.coverUrl"
            :src="track.coverUrl"
            :alt="`Album art for ${track.safeAlbum}`"
            class="grid-item__cover-img"
            loading="lazy"
            @error="(e) => { e.target.parentElement.querySelector('.grid-item__cover-img').style.display='none' }"
          />
          <div v-else class="grid-item__cover-placeholder">
            <span>&#9836;</span>
          </div>
          <!-- Play overlay -->
          <div class="grid-item__play-overlay" aria-hidden="true">
            <span>{{ track.id === currentTrack.track?.id && currentTrack.isPlaying ? '&#9646;&#9646;' : '&#9654;' }}</span>
          </div>
        </div>
        <div class="grid-item__meta">
          <span class="grid-item__title">{{ track.safeTitle }}</span>
          <span class="grid-item__artist text-secondary text-sm">{{ track.safeArtist }}</span>
        </div>
      </div>
    </div>

    <!-- List view -->
    <TrackList
      v-else
      :tracks="rawFilteredTracks"
      :active-track-id="currentTrack.track?.id"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import DOMPurify from 'dompurify';
import { getMedia, getCoverUrl } from '../api/media.js';
import { useCurrentTrackStore } from '../stores/currentTrack.js';
import { useQueueStore } from '../stores/queue.js';
import TrackList from '../components/TrackList.vue';
import NeumorphicButton from '../components/NeumorphicButton.vue';

const currentTrack = useCurrentTrackStore();
const queue = useQueueStore();

const allTracks = ref([]);
const isLoading = ref(false);
const loadError = ref('');
const searchQuery = ref('');
const viewMode = ref('list'); // 'list' | 'grid'

/**
 * Sanitize a track's metadata fields and enrich with computed URLs.
 * All user-controlled strings go through DOMPurify before touching the DOM.
 */
function sanitizeTrack(track) {
  return {
    ...track,
    safeTitle: DOMPurify.sanitize(track.title || 'Unknown Title'),
    safeArtist: DOMPurify.sanitize(track.artist || 'Unknown Artist'),
    safeAlbum: DOMPurify.sanitize(track.album || 'Unknown Album'),
    safeGenre: DOMPurify.sanitize(track.genre || ''),
    coverUrl: getCoverUrl(track.cover_path),
  };
}

async function fetchTracks() {
  isLoading.value = true;
  loadError.value = '';
  try {
    const res = await getMedia();
    const tracks = Array.isArray(res.data) ? res.data : res.data.tracks ?? [];
    allTracks.value = tracks.map(sanitizeTrack);
  } catch (err) {
    loadError.value = err.response?.status === 403
      ? 'You do not have permission to view the library.'
      : 'Failed to load the music library. Please check your connection.';
  } finally {
    isLoading.value = false;
  }
}

// Client-side filtering — no server round-trip needed for search
const filteredTracks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return allTracks.value;
  return allTracks.value.filter((t) =>
    t.safeTitle.toLowerCase().includes(q) ||
    t.safeArtist.toLowerCase().includes(q) ||
    t.safeAlbum.toLowerCase().includes(q) ||
    t.safeGenre.toLowerCase().includes(q)
  );
});

// Raw (non-sanitized-extra) tracks for TrackList which handles its own sanitization
const rawFilteredTracks = computed(() => filteredTracks.value);

function onSearchInput() {
  // Filtering is reactive via computed — no additional action needed.
  // This handler exists as a hook for future debouncing if needed.
}

function playTrack(track, index) {
  queue.setQueue(rawFilteredTracks.value, index);
}

onMounted(() => {
  fetchTracks();
});
</script>

<style scoped>
.library-view {
  padding-bottom: 1rem;
}

/* ---- Toolbar ---- */
.library-view__toolbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.library-view__search-wrap {
  flex: 1;
  min-width: 200px;
  position: relative;
}

.library-view__search {
  padding-left: 2.5rem;
}

.library-view__search-icon {
  color: var(--text-secondary);
  font-size: 1rem;
  left: 0.875rem;
  pointer-events: none;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.library-view__view-toggle {
  display: flex;
  gap: 0.4rem;
}

.view-btn--active {
  box-shadow: var(--shadow-inset-high), var(--shadow-inset-low);
  color: var(--accent);
}

.library-view__count {
  flex-shrink: 0;
}

/* ---- States ---- */
.library-view__loading,
.library-view__error,
.library-view__empty {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 4rem 1rem;
  text-align: center;
}

.library-view__error {
  color: var(--danger);
}

.library-view__empty span {
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

/* ---- Grid view ---- */
.library-view__grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, 1fr);
}

.library-view__grid-item {
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-high), var(--shadow-low);
  cursor: pointer;
  overflow: hidden;
  transition: box-shadow 0.15s ease, transform 0.1s ease;
}

.library-view__grid-item:hover {
  transform: translateY(-2px);
  box-shadow: calc(var(--shadow-high)), calc(var(--shadow-low)), 0 0 0 2px var(--accent-light);
}

.library-view__grid-item:focus-visible {
  box-shadow: 0 0 0 3px var(--accent);
  outline: none;
}

.library-view__grid-item--active {
  box-shadow: var(--shadow-inset-high), var(--shadow-inset-low);
}

.grid-item__cover {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.grid-item__cover-img {
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
  width: 100%;
}

.library-view__grid-item:hover .grid-item__cover-img {
  transform: scale(1.04);
}

.grid-item__cover-placeholder {
  align-items: center;
  background: var(--accent-light);
  color: var(--accent);
  display: flex;
  font-size: 3rem;
  height: 100%;
  justify-content: center;
}

/* Play overlay on hover */
.grid-item__play-overlay {
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  bottom: 0;
  color: #fff;
  display: flex;
  font-size: 2rem;
  justify-content: center;
  left: 0;
  opacity: 0;
  position: absolute;
  right: 0;
  top: 0;
  transition: opacity 0.15s ease;
}

.library-view__grid-item:hover .grid-item__play-overlay,
.library-view__grid-item:focus-visible .grid-item__play-overlay {
  opacity: 1;
}

.grid-item__meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow: hidden;
  padding: 0.75rem;
}

.grid-item__title {
  font-size: 0.9rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-item__artist {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- Responsive grid ---- */
@media (min-width: 600px) {
  .library-view__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 900px) {
  .library-view__grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1200px) {
  .library-view__grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 1600px) {
  .library-view__grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

/* Visually hidden (accessibility) */
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
