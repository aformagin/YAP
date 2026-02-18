<template>
  <div class="track-list">
    <ul
      v-if="tracks.length > 0"
      class="track-list__list"
      role="list"
      aria-label="Music tracks"
    >
      <TrackItem
        v-for="(track, index) in tracks"
        :key="track.id"
        :track="track"
        :is-active="track.id === activeTrackId"
        @play="handlePlay(index)"
      />
    </ul>

    <div v-else class="track-list__empty" role="status">
      <span class="track-list__empty-icon" aria-hidden="true">&#9836;</span>
      <p>No tracks found.</p>
      <p class="text-secondary text-sm">Ask an admin to scan a music directory.</p>
    </div>
  </div>
</template>

<script setup>
import { useQueueStore } from '../stores/queue.js';
import TrackItem from './TrackItem.vue';

const props = defineProps({
  tracks: {
    type: Array,
    required: true,
    default: () => [],
  },
  activeTrackId: {
    type: [Number, String, null],
    default: null,
  },
});

const queue = useQueueStore();

function handlePlay(index) {
  queue.setQueue(props.tracks, index);
}
</script>

<style scoped>
.track-list {
  width: 100%;
}

.track-list__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  list-style: none;
  padding: 0;
}

/* Empty state */
.track-list__empty {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 4rem 1rem;
  text-align: center;
}

.track-list__empty-icon {
  color: var(--accent);
  font-size: 3rem;
  opacity: 0.5;
}
</style>
