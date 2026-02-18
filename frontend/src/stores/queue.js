import { defineStore } from 'pinia';

export const useQueueStore = defineStore('queue', {
  state: () => ({
    /** Full list of tracks in the current queue */
    tracks: [],
    /** Index of the currently active track in `tracks` */
    currentIndex: -1,
    /** When true, next() picks a random unplayed track */
    shuffle: false,
    /** 'none' | 'one' | 'all' */
    repeat: 'none',
    /** Indices already played this shuffle session (resets when all played) */
    _shuffleHistory: [],
  }),

  getters: {
    currentTrack: (state) => {
      if (state.currentIndex < 0 || state.currentIndex >= state.tracks.length) return null;
      return state.tracks[state.currentIndex];
    },
    hasNext: (state) => {
      if (state.repeat !== 'none') return true;
      return state.currentIndex < state.tracks.length - 1;
    },
    hasPrevious: (state) => state.currentIndex > 0,
  },

  actions: {
    /**
     * Replace the entire queue with a new track list and begin playing from startIndex.
     */
    setQueue(tracks, startIndex = 0) {
      this.tracks = [...tracks];
      this.currentIndex = startIndex;
      this._shuffleHistory = [startIndex];
      this._loadCurrent();
    },

    /**
     * Advance to the next track, respecting repeat and shuffle settings.
     */
    next() {
      if (this.tracks.length === 0) return;

      if (this.repeat === 'one') {
        // Replay the same track from the beginning
        this._loadCurrent();
        return;
      }

      if (this.shuffle) {
        this._nextShuffle();
        return;
      }

      if (this.currentIndex < this.tracks.length - 1) {
        this.currentIndex++;
        this._loadCurrent();
      } else if (this.repeat === 'all') {
        // Loop back to the start
        this.currentIndex = 0;
        this._loadCurrent();
      }
      // If repeat === 'none' and we're at the end, do nothing
    },

    /**
     * Go back to the previous track.
     * If the current track has played for more than 3 seconds, seek to start instead.
     */
    previous() {
      if (this.tracks.length === 0) return;

      // Dynamic import to avoid circular dependency at module parse time
      import('./currentTrack.js').then(({ useCurrentTrackStore }) => {
        const player = useCurrentTrackStore();

        if (player.currentTime > 3) {
          // Restart current track
          player.seek(0);
          return;
        }

        if (this.currentIndex > 0) {
          this.currentIndex--;
          this._loadCurrent();
        } else if (this.repeat === 'all') {
          this.currentIndex = this.tracks.length - 1;
          this._loadCurrent();
        }
      });
    },

    toggleShuffle() {
      this.shuffle = !this.shuffle;
      this._shuffleHistory = this.currentIndex >= 0 ? [this.currentIndex] : [];
    },

    /**
     * Cycle through repeat modes: none → one → all → none
     */
    toggleRepeat() {
      const modes = ['none', 'one', 'all'];
      const idx = modes.indexOf(this.repeat);
      this.repeat = modes[(idx + 1) % modes.length];
    },

    addToQueue(track) {
      this.tracks.push(track);
    },

    removeFromQueue(index) {
      if (index < 0 || index >= this.tracks.length) return;
      this.tracks.splice(index, 1);

      // Adjust currentIndex if needed
      if (index < this.currentIndex) {
        this.currentIndex--;
      } else if (index === this.currentIndex) {
        // The playing track was removed — clamp to valid range
        this.currentIndex = Math.min(this.currentIndex, this.tracks.length - 1);
        if (this.tracks.length > 0) {
          this._loadCurrent();
        }
      }
    },

    clearQueue() {
      this.tracks = [];
      this.currentIndex = -1;
      this._shuffleHistory = [];
      import('./currentTrack.js').then(({ useCurrentTrackStore }) => {
        const player = useCurrentTrackStore();
        if (player.audioEl) {
          player.audioEl.pause();
          player.audioEl.src = '';
        }
        player.track = null;
        player.isPlaying = false;
        player.currentTime = 0;
        player.duration = 0;
      });
    },

    // ------------------------------------------------------------------
    // Private helpers
    // ------------------------------------------------------------------

    _loadCurrent() {
      if (this.currentIndex < 0 || this.currentIndex >= this.tracks.length) return;
      const track = this.tracks[this.currentIndex];
      import('./currentTrack.js').then(({ useCurrentTrackStore }) => {
        const player = useCurrentTrackStore();
        player.loadTrack(track);
      });
    },

    _nextShuffle() {
      const unplayed = this.tracks
        .map((_, i) => i)
        .filter((i) => !this._shuffleHistory.includes(i));

      if (unplayed.length === 0) {
        if (this.repeat === 'all') {
          // All tracks played — start a fresh shuffle cycle
          this._shuffleHistory = [];
          const randomIdx = Math.floor(Math.random() * this.tracks.length);
          this.currentIndex = randomIdx;
          this._shuffleHistory.push(randomIdx);
          this._loadCurrent();
        }
        // If repeat is 'none', stop here
        return;
      }

      const randomIdx = unplayed[Math.floor(Math.random() * unplayed.length)];
      this.currentIndex = randomIdx;
      this._shuffleHistory.push(randomIdx);
      this._loadCurrent();
    },
  },
});
