<template>
  <div
    v-if="player.track"
    class="audio-player neu-card"
    role="region"
    aria-label="Audio player"
  >
    <!-- Left: Track info -->
    <div class="audio-player__track">
      <div class="audio-player__cover" aria-hidden="true">
        <img
          v-if="coverUrl"
          :src="coverUrl"
          :alt="`Cover art for ${safeTitle}`"
          class="audio-player__cover-img"
          @error="onCoverError"
        />
        <div v-else class="audio-player__cover-placeholder">
          <span>&#9836;</span>
        </div>
      </div>
      <div class="audio-player__info">
        <span class="audio-player__title" :title="safeTitle">{{ safeTitle }}</span>
        <span class="audio-player__artist" :title="safeArtist">{{ safeArtist }}</span>
      </div>
    </div>

    <!-- Center: Controls + Progress -->
    <div class="audio-player__center">
      <!-- Transport controls -->
      <div class="audio-player__controls" role="group" aria-label="Playback controls">
        <NeumorphicButton
          variant="icon"
          aria-label="Previous track"
          @click="queue.previous()"
        >
          &#9664;&#9664;
        </NeumorphicButton>

        <NeumorphicButton
          variant="primary"
          class="audio-player__play-btn"
          :aria-label="player.isPlaying ? 'Pause' : 'Play'"
          @click="togglePlayPause"
        >
          <span v-if="player.isPlaying" aria-hidden="true">&#10074;&#10074;</span>
          <span v-else class="play-icon" aria-hidden="true">&#9654;</span>
        </NeumorphicButton>

        <NeumorphicButton
          variant="icon"
          aria-label="Next track"
          @click="queue.next()"
        >
          &#9654;&#9654;
        </NeumorphicButton>
      </div>

      <!-- Progress bar -->
      <div class="audio-player__progress" role="group" aria-label="Track progress">
        <span class="audio-player__time audio-player__time--current" aria-label="Current time">
          {{ formatTime(player.currentTime) }}
        </span>

        <div class="audio-player__seek-wrap">
          <input
            type="range"
            class="audio-player__seek"
            :value="player.currentTime"
            :max="player.duration || 0"
            step="1"
            aria-label="Seek"
            :aria-valuemin="0"
            :aria-valuemax="player.duration"
            :aria-valuenow="Math.floor(player.currentTime)"
            :aria-valuetext="`${formatTime(player.currentTime)} of ${formatTime(player.duration)}`"
            :style="{ '--seek-fill': progressPercent + '%' }"
            @input="onSeekInput"
            @change="onSeekCommit"
          />
        </div>

        <span class="audio-player__time audio-player__time--duration" aria-label="Total duration">
          {{ formatTime(player.duration) }}
        </span>
      </div>
    </div>

    <!-- Right: Volume + Shuffle + Repeat -->
    <div class="audio-player__secondary" role="group" aria-label="Playback options">
      <!-- Shuffle -->
      <NeumorphicButton
        variant="icon"
        :class="{ 'audio-player__btn--active': queue.shuffle }"
        :aria-label="queue.shuffle ? 'Shuffle on — click to disable' : 'Shuffle off — click to enable'"
        :aria-pressed="queue.shuffle"
        @click="queue.toggleShuffle()"
      >
        &#128256;
      </NeumorphicButton>

      <!-- Repeat -->
      <NeumorphicButton
        variant="icon"
        :class="{ 'audio-player__btn--active': queue.repeat !== 'none' }"
        :aria-label="repeatAriaLabel"
        :aria-pressed="queue.repeat !== 'none'"
        @click="queue.toggleRepeat()"
      >
        <span v-if="queue.repeat === 'one'">&#128257;&#185;</span>
        <span v-else>&#128257;</span>
      </NeumorphicButton>

      <!-- Volume -->
      <div class="audio-player__volume-wrap" aria-label="Volume control">
        <span class="audio-player__volume-icon" aria-hidden="true">
          {{ volumeIcon }}
        </span>
        <div class="audio-player__volume-slider-wrap neu-inset">
          <input
            type="range"
            class="audio-player__volume"
            :value="player.volume"
            min="0"
            max="1"
            step="0.05"
            aria-label="Volume"
            :aria-valuenow="Math.round(player.volume * 100)"
            aria-valuetext="`${Math.round(player.volume * 100)}%`"
            @input="onVolumeChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import DOMPurify from 'dompurify';
import { useCurrentTrackStore } from '../stores/currentTrack.js';
import { useQueueStore } from '../stores/queue.js';
import { getCoverUrl } from '../api/media.js';
import NeumorphicButton from './NeumorphicButton.vue';

const player = useCurrentTrackStore();
const queue = useQueueStore();

// --- Sanitize metadata ---
const safeTitle = computed(() => DOMPurify.sanitize(player.track?.title || 'Unknown Track'));
const safeArtist = computed(() => DOMPurify.sanitize(player.track?.artist || 'Unknown Artist'));

// --- Cover art with error fallback ---
const coverErrored = ref(false);
const coverUrl = computed(() => {
  if (coverErrored.value || !player.track) return null;
  return getCoverUrl(player.track.cover_path);
});

function onCoverError() {
  coverErrored.value = true;
}

// --- Playback ---
function togglePlayPause() {
  if (player.isPlaying) {
    player.pause();
  } else {
    player.play();
  }
}

// --- Seek ---
// Track whether user is actively scrubbing so we don't fight timeupdate
const isScrubbing = ref(false);

function onSeekInput(e) {
  isScrubbing.value = true;
  // Optimistically update the displayed time while dragging
  player.currentTime = parseFloat(e.target.value);
}

function onSeekCommit(e) {
  player.seek(parseFloat(e.target.value));
  isScrubbing.value = false;
}

// --- Volume ---
function onVolumeChange(e) {
  player.setVolume(parseFloat(e.target.value));
}

// --- Progress % for the visual fill ---
const progressPercent = computed(() => {
  if (!player.duration) return 0;
  return (player.currentTime / player.duration) * 100;
});

// --- Time formatter ---
function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// --- Volume icon ---
const volumeIcon = computed(() => {
  if (player.volume === 0) return '🔇';
  if (player.volume < 0.5) return '🔈';
  return '🔊';
});

// --- Repeat ARIA label ---
const repeatAriaLabel = computed(() => {
  switch (queue.repeat) {
    case 'one': return 'Repeat one — click to disable';
    case 'all': return 'Repeat all — click to repeat one';
    default: return 'Repeat off — click to repeat all';
  }
});
</script>

<style scoped>
.audio-player {
  align-items: center;
  bottom: 0;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.1), var(--shadow-high);
  display: flex;
  gap: 1rem;
  left: 0;
  padding: 0.75rem 1.5rem;
  position: fixed;
  right: 0;
  z-index: 90;
  /* Override neu-card border-radius for a flush bottom bar */
  border-radius: 0;
  border-top-left-radius: var(--border-radius);
  border-top-right-radius: var(--border-radius);
}

/* ---- Track info (left) ---- */
.audio-player__track {
  align-items: center;
  display: flex;
  flex: 0 0 220px;
  gap: 0.75rem;
  min-width: 0;
}

.audio-player__cover {
  border-radius: 8px;
  flex-shrink: 0;
  height: 50px;
  overflow: hidden;
  width: 50px;
}

.audio-player__cover-img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.audio-player__cover-placeholder {
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

.audio-player__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.audio-player__title {
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-player__artist {
  color: var(--text-secondary);
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- Center: controls + progress ---- */
.audio-player__center {
  align-items: center;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.audio-player__controls {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.audio-player__play-btn {
  height: 48px;
  width: 48px;
  border-radius: 50%;
  font-size: 1.2rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ▶ sits visually left of its glyph centre — nudge it right */
.audio-player__play-btn .play-icon {
  margin-left: 3px;
}

/* ---- Progress ---- */
.audio-player__progress {
  align-items: center;
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

@media (min-width: 1921px) {
  .audio-player__progress {
    max-width: 55%;
  }
}

.audio-player__time {
  color: var(--text-secondary);
  flex-shrink: 0;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  min-width: 36px;
}

.audio-player__time--current {
  text-align: right;
}

.audio-player__seek-wrap {
  flex: 1;
}

.audio-player__seek {
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  height: 20px;
  width: 100%;
}

.audio-player__seek::-webkit-slider-runnable-track {
  background: linear-gradient(
    to right,
    var(--accent) var(--seek-fill, 0%),
    rgba(128, 128, 128, 0.35) var(--seek-fill, 0%)
  );
  border-radius: 4px;
  height: 4px;
}

.audio-player__seek::-moz-range-track {
  background: rgba(128, 128, 128, 0.35);
  border-radius: 4px;
  height: 4px;
}

.audio-player__seek::-moz-range-progress {
  background: var(--accent);
  border-radius: 4px;
  height: 4px;
}

.audio-player__seek::-webkit-slider-thumb {
  -webkit-appearance: none;
  background: var(--accent);
  border-radius: 50%;
  height: 14px;
  margin-top: -5px;
  width: 14px;
}

.audio-player__seek::-moz-range-thumb {
  background: var(--accent);
  border: none;
  border-radius: 50%;
  height: 14px;
  width: 14px;
}

/* ---- Secondary controls (right) ---- */
.audio-player__secondary {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 0.5rem;
}

.audio-player__btn--active {
  color: var(--accent);
  box-shadow: var(--shadow-inset-high), var(--shadow-inset-low);
}

/* ---- Volume ---- */
.audio-player__volume-wrap {
  align-items: center;
  display: flex;
  gap: 0.4rem;
}

.audio-player__volume-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.audio-player__volume-slider-wrap {
  padding: 0.4rem 0.6rem;
  width: 90px;
}

.audio-player__volume {
  width: 100%;
}

/* ---- Responsive ---- */
@media (max-width: 767px) {
  .audio-player {
    border-radius: 0;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
  }

  .audio-player__track {
    flex: 1;
    min-width: 0;
  }

  .audio-player__center {
    order: 3;
    width: 100%;
  }

  .audio-player__secondary {
    flex-shrink: 0;
  }

  .audio-player__volume-slider-wrap {
    width: 70px;
  }
}

@media (max-width: 480px) {
  .audio-player__track {
    flex: 0 0 100%;
  }

  .audio-player__secondary {
    display: none;
  }
}
</style>
