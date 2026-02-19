import { createRouter, createWebHistory } from 'vue-router';
import { useUserAuthStore } from '../stores/userAuth.js';

const routes = [
  {
    path: '/login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/change-password',
    component: () => import('../views/ChangePasswordView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    redirect: '/library',
  },
  {
    path: '/library',
    component: () => import('../views/LibraryView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/queue',
    component: () => import('../views/QueueView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/videos',
    component: () => import('../views/VideoLibrary.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  // Catch-all — redirect unknown paths to library (or login if unauthenticated)
  {
    path: '/:pathMatch(.*)*',
    redirect: '/library',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Global navigation guard
router.beforeEach(async (to) => {
  const auth = useUserAuthStore();

  // Step 1: Try to restore session if not yet authenticated
  if (!auth.isAuthenticated) {
    try {
      await auth.fetchMe();
    } catch {
      // Session restore failed — only block access to protected routes
      if (!to.meta.public) return '/login';
    }
  }

  // Step 2: If on the login page but already authenticated, redirect to library
  if (to.path === '/login' && auth.isAuthenticated) {
    return '/library';
  }

  // Step 3: Force password change before any other navigation
  if (
    auth.isAuthenticated &&
    auth.user?.is_admin &&
    auth.user?.must_change_password &&
    to.path !== '/change-password'
  ) {
    return '/change-password';
  }

  // Step 4: Admin route guard
  if (to.meta.requiresAdmin && !auth.user?.is_admin) {
    return '/library';
  }

  // All checks passed — allow navigation
});

export default router;
