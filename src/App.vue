<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
:root {
  --guide-center: #ff3b30;
  --guide-cap: #0a84ff;
  --guide-xh: #30b158;
  --guide-base: #ff9500;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  background: #fff;
  color: #000;
  font-family:
    -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 14px;
  border: 1px solid #000;
  border-radius: 999px;
  background: #fff;
  color: #000;
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}

button.pill:hover {
  background: #f0f0f0;
}

.pill.active,
button.pill.active:hover {
  background: #000;
  color: #fff;
}

.pill.small {
  height: 26px;
  padding: 0 11px;
  font-size: 11px;
}

.pill.round {
  padding: 0;
  aspect-ratio: 1;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
