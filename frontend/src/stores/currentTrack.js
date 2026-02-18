import { defineStore } from 'pinia';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const useCurrentTrackStore = defineStore('currentTrack', {
  state: () => ({
    /** Track metadata object or null. Shape: { id, title, artist, album, cover_path, duration } */
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    /** The single shared HTMLAudioElement instance */
    audioEl: null,
    /** True when audio has errored out */
    hasError: false,
  }),

  actions: {
    /**
     * Create the HTMLAudioElement exactly once and wire up all events.
     * Call this from App.vue onMounted so it runs in a browser context.
     */
    init() {
      if (this.audioEl) return; // Guard against double-init

      const audio = new Audio();
      audio.preload = 'metadata';
      audio.volume = this.volume;

      // Keep store state in sync with the audio element's events
      audio.addEventListener('timeupdate', () => {
        this.currentTime = audio.currentTime;
      });

      audio.addEventListener('loadedmetadata', () => {
        this.duration = audio.duration;
        this.hasError = false;
      });

      audio.addEventListener('ended', () => {
        this.isPlaying = false;
        // Delegate "what to play next" to the queue store
        // We do a dynamic import to avoid circular dependency at module load time
        import('./queue.js').then(({ useQueueStore }) => {
          const queue = useQueueStore();
          queue.next();
        });
      });

      audio.addEventListener('pause', () => {
        this.isPlaying = false;
      });

      audio.addEventListener('play', () => {
        this.isPlaying = true;
        this.hasError = false;
      });

      audio.addEventListener('error', () => {
        this.isPlaying = false;
        this.hasError = true;
      });

      this.audioEl = audio;
    },

    /**
     * Load a new track into the audio element and begin playing.
     * The track object must have at least an `id` field.
     */
    loadTrack(track) {
      if (!this.audioEl) this.init();

      this.track = track;
      this.hasError = false;
      this.currentTime = 0;
      this.duration = 0;
      this.isPlaying = false;

      this.audioEl.src = `${BASE_URL}/api/stream/${track.id}`;
      this.audioEl.load();
      this.audioEl.play().catch(() => {
        // Autoplay was blocked by the browser — the user can manually hit play
        this.isPlaying = false;
      });
    },

    play() {
      if (!this.audioEl || !this.track) return;
      this.audioEl.play().catch(() => {
        this.isPlaying = false;
      });
    },

    pause() {
      if (!this.audioEl) return;
      this.audioEl.pause();
    },

    /**
     * Seek to an absolute position in seconds.
     */
    seek(seconds) {
      if (!this.audioEl) return;
      const clamped = Math.max(0, Math.min(seconds, this.duration));
      this.audioEl.currentTime = clamped;
      this.currentTime = clamped;
    },

    /**
     * Set volume in the range [0, 1].
     */
    setVolume(vol) {
      const clamped = Math.max(0, Math.min(1, vol));
      this.volume = clamped;
      if (this.audioEl) {
        this.audioEl.volume = clamped;
      }
    },
  },
});
