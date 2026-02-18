<template>
  <div class="queue-view" role="main" aria-label="Playback queue">
    <!-- Header -->
    <div class="queue-view__header">
      <div>
        <h1 class="queue-view__title">Queue</h1>
        <p class="text-secondary text-sm">
          {{ queue.tracks.length }} {{ queue.tracks.length === 1 ? 'track' : 'tracks' }}
          <span v-if="queue.currentIndex >= 0">
            &mdash; playing {{ queue.currentIndex + 1 }} of {{ queue.tracks.length }}
          </span>
        </p>
      </div>
      <NeumorphicButton
        v-if="queue.tracks.length > 0"
        variant="danger"
        @click="confirmClearQueue"
        aria-label="Clear the entire queue"
      >
        Clear Queue
      </NeumorphicButton>
    </div>

    <!-- Empty state -->
    <div v-if="queue.tracks.length === 0" class="queue-view__empty" role="status">
      <span aria-hidden="true">&#9776;</span>
      <p>Your queue is empty.</p>
      <p class="text-secondary text-sm">Go to the Library and play a track to get started.</p>
      <NeumorphicButton variant="default" @click="router.push('/library')">
        Browse Library
      </NeumorphicButton>
    </div>

    <!-- Queue list with drag-to-reorder -->
    <ul
      v-else
      class="queue-view__list"
      role="list"
      aria-label="Queue items"
    >
      <li
        v-for="(track, index) in queue.tracks"
        :key="`${track.id}-${index}`"
        class="queue-item"
        :class="{
          'queue-item--active': index === queue.currentIndex,
          'queue-item--played': index < queue.currentIndex,
          'queue-item--dragging': dragIndex === index,
          'queue-item--drag-over': dragOverIndex === index,
        }"
        draggable="true"
        :aria-label="`${index === queue.currentIndex ? 'Now playing: ' : ''}${track.title} by ${track.artist || 'Unknown Artist'}`"
        :aria-current="index === queue.currentIndex ? 'true' : undefined"
        @dragstart="onDragStart(index, $event)"
        @dragover.prevent="onDragOver(index)"
        @dragleave="onDragLeave"
        @drop="onDrop(index)"
        @dragend="onDragEnd"
      >
        <!-- Drag handle -->
        <span
          class="queue-item__drag-handle"
          aria-hidden="true"
          title="Drag to reorder"
        >
          &#8942;&#8942;
        </span>

        <!-- Track number / position -->
        <span class="queue-item__position" aria-hidden="true">
          <span v-if="index === queue.currentIndex && currentTrack.isPlaying" class="playing-bars">
            <span class="bar" /><span class="bar" /><span class="bar" />
          </span>
          <span v-else>{{ index + 1 }}</span>
        </span>

        <!-- Cover art -->
        <div class="queue-item__cover" aria-hidden="true">
          <img
            v-if="getCoverUrl(track.cover_path)"
            :src="getCoverUrl(track.cover_path)"
            :alt="`Cover for ${track.title}`"
            class="queue-item__cover-img"
            loading="lazy"
          />
          <div v-else class="queue-item__cover-placeholder">
            <span>&#9836;</span>
          </div>
        </div>

        <!-- Metadata -->
        <div class="queue-item__meta">
          <span class="queue-item__title">{{ DOMPurify.sanitize(track.title || 'Unknown') }}</span>
          <span class="queue-item__artist text-secondary text-sm">
            {{ DOMPurify.sanitize(track.artist || 'Unknown Artist') }}
          </span>
        </div>

        <!-- Duration -->
        <span class="queue-item__duration text-secondary text-sm">
          {{ formatTime(track.duration) }}
        </span>

        <!-- Actions -->
        <div class="queue-item__actions">
          <NeumorphicButton
            variant="icon"
            class="queue-item__play-btn"
            :aria-label="`Play ${track.title}`"
            @click="playAt(index)"
          >
            &#9654;
          </NeumorphicButton>
          <NeumorphicButton
            variant="icon"
            class="queue-item__remove-btn"
            :aria-label="`Remove ${track.title} from queue`"
            @click="queue.removeFromQueue(index)"
          >
            &#10005;
          </NeumorphicButton>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import DOMPurify from 'dompurify';
import { useQueueStore } from '../stores/queue.js';
import { useCurrentTrackStore } from '../stores/currentTrack.js';
import { getCoverUrl } from '../api/media.js';
import NeumorphicButton from '../components/NeumorphicButton.vue';

const router = useRouter();
const queue = useQueueStore();
const currentTrack = useCurrentTrackStore();

// --- Drag-to-reorder state ---
const dragIndex = ref(null);
const dragOverIndex = ref(null);

function onDragStart(index, event) {
  dragIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
}

function onDragOver(index) {
  dragOverIndex.value = index;
}

function onDragLeave() {
  // Keep dragOverIndex until we settle on a target (cleared in onDrop/onDragEnd)
}

function onDrop(targetIndex) {
  if (dragIndex.value === null || dragIndex.value === targetIndex) {
    onDragEnd();
    return;
  }

  const tracks = [...queue.tracks];
  const movedTrack = tracks.splice(dragIndex.value, 1)[0];
  tracks.splice(targetIndex, 0, movedTrack);

  // Adjust currentIndex to follow the track being played
  let newCurrentIndex = queue.currentIndex;
  if (queue.currentIndex === dragIndex.value) {
    newCurrentIndex = targetIndex;
  } else if (dragIndex.value < queue.currentIndex && targetIndex >= queue.currentIndex) {
    newCurrentIndex--;
  } else if (dragIndex.value > queue.currentIndex && targetIndex <= queue.currentIndex) {
    newCurrentIndex++;
  }

  queue.tracks = tracks;
  queue.currentIndex = newCurrentIndex;
  onDragEnd();
}

function onDragEnd() {
  dragIndex.value = null;
  dragOverIndex.value = null;
}

// --- Play a specific queue position ---
function playAt(index) {
  queue.currentIndex = index;
  // Access private helper — call loadCurrent via setQueue trick
  const track = queue.tracks[index];
  if (track) {
    currentTrack.loadTrack(track);
  }
}

// --- Clear queue ---
function confirmClearQueue() {
  if (window.confirm('Clear the entire queue?')) {
    queue.clearQueue();
  }
}

// --- Duration formatter ---
function formatTime(secs) {
  if (!secs || isNaN(secs)) return '--:--';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
</script>

<style scoped>
.queue-view {
  max-width: 900px;
  margin: 0 auto;
}

/* ---- Header ---- */
.queue-view__header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.queue-view__title {
  font-size: 1.5rem;
  font-weight: 700;
}

/* ---- Empty state ---- */
.queue-view__empty {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 4rem 1rem;
  text-align: center;
}

.queue-view__empty span {
  color: var(--accent);
  font-size: 3rem;
  opacity: 0.4;
}

/* ---- Queue list ---- */
.queue-view__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
}

/* ---- Queue item ---- */
.queue-item {
  align-items: center;
  border-radius: 12px;
  cursor: default;
  display: flex;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  transition: background 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.queue-item:hover {
  background: var(--accent-light);
}

/* Active (now playing) */
.queue-item--active {
  background: var(--accent-light);
  box-shadow: var(--shadow-inset-high), var(--shadow-inset-low);
}

.queue-item--active .queue-item__title {
  color: var(--accent);
  font-weight: 600;
}

/* Already played */
.queue-item--played {
  opacity: 0.55;
}

/* Drag states */
.queue-item--dragging {
  opacity: 0.4;
}

.queue-item--drag-over {
  box-shadow: 0 0 0 2px var(--accent);
  border-radius: 12px;
}

/* ---- Drag handle ---- */
.queue-item__drag-handle {
  color: var(--text-secondary);
  cursor: grab;
  flex-shrink: 0;
  font-size: 0.75rem;
  letter-spacing: -4px;
  opacity: 0.5;
  user-select: none;
}

.queue-item:hover .queue-item__drag-handle {
  opacity: 1;
}

/* ---- Position number ---- */
.queue-item__position {
  color: var(--text-secondary);
  flex-shrink: 0;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  min-width: 24px;
  text-align: center;
}

/* Playing animation bars */
.playing-bars {
  align-items: flex-end;
  display: inline-flex;
  gap: 2px;
  height: 14px;
}

.bar {
  animation: bounce 0.8s ease infinite alternate;
  background: var(--accent);
  border-radius: 2px;
  display: block;
  width: 3px;
}

.bar:nth-child(2) { animation-delay: 0.2s; }
.bar:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  from { height: 3px; }
  to { height: 12px; }
}

/* ---- Cover ---- */
.queue-item__cover {
  border-radius: 6px;
  flex-shrink: 0;
  height: 44px;
  overflow: hidden;
  width: 44px;
}

.queue-item__cover-img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.queue-item__cover-placeholder {
  align-items: center;
  background: var(--accent-light);
  border-radius: 6px;
  color: var(--accent);
  display: flex;
  font-size: 1.2rem;
  height: 100%;
  justify-content: center;
  width: 100%;
}

/* ---- Metadata ---- */
.queue-item__meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.queue-item__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-item__artist {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- Duration ---- */
.queue-item__duration {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* ---- Actions ---- */
.queue-item__actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.queue-item:hover .queue-item__actions,
.queue-item:focus-within .queue-item__actions {
  opacity: 1;
}

.queue-item__play-btn {
  color: var(--accent);
  font-size: 0.875rem;
}

.queue-item__remove-btn {
  color: var(--danger);
  font-size: 0.875rem;
}
</style>
