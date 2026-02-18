<template>
  <span class="local-badge" role="status" aria-label="Server is in local offline mode">
    &#128225; Local Mode
  </span>
</template>

<style scoped>
.local-badge {
  background: var(--accent-light);
  border-radius: 20px;
  color: var(--accent);
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  transition: background var(--transition), color var(--transition);
}
</style>
