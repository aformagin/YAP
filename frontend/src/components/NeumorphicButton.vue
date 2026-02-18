<template>
  <button
    class="neu-btn"
    :class="[`neu-btn--${variant}`, { 'neu-btn--pressed': isPressed }]"
    :aria-pressed="variant === 'toggle' ? isPressed : undefined"
    @mousedown="handlePress"
    @mouseup="handleRelease"
    @mouseleave="handleRelease"
    @touchstart.passive="handlePress"
    @touchend.passive="handleRelease"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  /**
   * Visual variant:
   * - 'default'  Plain neumorphic button (grey)
   * - 'primary'  Accent-coloured fill
   * - 'icon'     Square shape, minimal padding for icon-only buttons
   * - 'danger'   Destructive action colour
   * - 'toggle'   Stays pressed when active (used for shuffle/repeat)
   */
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'icon', 'danger', 'toggle'].includes(v),
  },
});

const isPressed = ref(false);

function handlePress() {
  isPressed.value = true;
}

function handleRelease() {
  isPressed.value = false;
}
</script>

<style scoped>
.neu-btn {
  /* Base reset */
  appearance: none;
  -webkit-appearance: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1;
  outline: none;
  user-select: none;

  /* Neumorphic raised state */
  background: var(--bg);
  border-radius: 12px;
  box-shadow: var(--shadow-high), var(--shadow-low);
  color: var(--text);
  padding: 0.75rem 1.5rem;

  /* Smooth press + theme transitions */
  transition: box-shadow 0.15s ease, transform 0.1s ease, background 0.2s ease,
    color 0.2s ease;

  /* Minimum touch target — 44px as per WCAG */
  min-height: 44px;
}

/* ---- Focus visible for keyboard navigation ---- */
.neu-btn:focus-visible {
  box-shadow: var(--shadow-high), var(--shadow-low), 0 0 0 3px var(--accent);
}

/* ---- Hover (non-pressed) ---- */
.neu-btn:hover:not(.neu-btn--pressed):not(:active) {
  box-shadow: var(--shadow-high), var(--shadow-low), 0 0 0 2px var(--accent-light);
}

/* ---- Pressed / Active state ---- */
.neu-btn--pressed,
.neu-btn:active {
  box-shadow: var(--shadow-inset-high), var(--shadow-inset-low);
  transform: scale(0.97);
}

/* ---- Primary variant ---- */
.neu-btn--primary {
  background: var(--accent);
  color: #fff;
  box-shadow: var(--shadow-high), var(--shadow-low);
}

.neu-btn--primary:hover:not(.neu-btn--pressed):not(:active) {
  background: var(--accent-dark);
  box-shadow: var(--shadow-high), var(--shadow-low);
}

.neu-btn--primary.neu-btn--pressed,
.neu-btn--primary:active {
  box-shadow: inset -2px -2px 6px rgba(255, 255, 255, 0.25),
    inset 2px 2px 6px rgba(0, 0, 0, 0.3);
  transform: scale(0.97);
}

/* ---- Icon variant ---- */
.neu-btn--icon {
  border-radius: 10px;
  padding: 0;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

/* ---- Danger variant ---- */
.neu-btn--danger {
  color: var(--danger);
}

.neu-btn--danger:hover:not(.neu-btn--pressed):not(:active) {
  background: var(--danger-light);
  box-shadow: var(--shadow-high), var(--shadow-low), 0 0 0 2px var(--danger-light);
}
</style>
