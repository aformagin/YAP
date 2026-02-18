import axios from 'axios';

const client = axios.create({
  // In development: falls back to the local backend.
  // In Docker: VITE_API_BASE_URL is '' at build time so axios uses relative
  // URLs ("/api/...") which nginx then proxies to the backend container.
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  withCredentials: true, // CRITICAL: send cookies cross-origin for session auth
});

// Global 401 interceptor: redirect to login if session expired
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid redirect loop if already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
