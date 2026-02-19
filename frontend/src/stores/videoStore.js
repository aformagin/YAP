import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getVideos, scanVideos as apiScanVideos } from '../api/video.js';

export const useVideoStore = defineStore('video', () => {
  const videos = ref([]);
  const isLoading = ref(false);
  const scanning = ref(false);
  const error = ref('');

  async function fetchVideos() {
    isLoading.value = true;
    error.value = '';
    try {
      const res = await getVideos();
      videos.value = Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      error.value = err.response?.status === 403
        ? 'You do not have permission to view the video library.'
        : 'Failed to load video library.';
    } finally {
      isLoading.value = false;
    }
  }

  async function scanLibrary() {
    if (scanning.value) return;
    scanning.value = true;
    error.value = '';
    try {
      await apiScanVideos();
      // Refresh the list after a short delay to pick up newly scanned files
      setTimeout(() => fetchVideos(), 1500);
    } catch (err) {
      error.value = err.response?.data?.message || 'Scan failed.';
    } finally {
      scanning.value = false;
    }
  }

  return { videos, isLoading, scanning, error, fetchVideos, scanLibrary };
});
