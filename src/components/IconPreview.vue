<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { FontMetrics } from '@/composables/useFonts'

const props = defineProps<{
  iconUrl: string | null
  label: string
  size: number
  fontSize: number
  fontStack: string
  gap: number
  zoomed?: boolean
  guides?: boolean
  metrics?: FontMetrics | null
}>()

const emit = defineEmits<{
  'update:label': [value: string]
  pick: []
}>()

const labelEl = ref<HTMLSpanElement | null>(null)

// The label is a contenteditable span. Its text is written imperatively so Vue
// never re-renders it while someone is typing (which would move the caret).
function syncLabel() {
  if (labelEl.value && labelEl.value.textContent !== props.label) {
    labelEl.value.textContent = props.label
  }
}
onMounted(syncLabel)
watch(() => props.label, syncLabel)

function onInput() {
  emit('update:label', labelEl.value?.textContent ?? '')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    labelEl.value?.blur()
  }
}
</script>

<template>
  <div
    class="preview"
    :class="{ zoomed }"
    :style="{
      gap: `${gap}px`,
      height: `${size}px`,
    }"
  >
    <button
      type="button"
      class="frame"
      :class="{ empty: !iconUrl }"
      :style="{ width: `${size}px`, height: `${size}px` }"
      :title="iconUrl ? 'Replace icon' : 'Upload icon'"
      :aria-label="iconUrl ? 'Replace icon' : 'Upload icon'"
      @click="emit('pick')"
    >
      <img v-if="iconUrl" :src="iconUrl" alt="" draggable="false" />
    </button>

    <span
      ref="labelEl"
      class="label"
      contenteditable="plaintext-only"
      spellcheck="false"
      title="Click to edit"
      :style="{
        fontFamily: fontStack,
        fontSize: `${fontSize}px`,
        lineHeight: `${size}px`,
      }"
      @input="onInput"
      @keydown="onKeydown"
    />

    <template v-if="guides && metrics">
      <span class="guide frame-outline" :style="{ width: `${size}px`, height: `${size}px` }" />
      <span class="guide line center" :style="{ top: `${size / 2}px` }" />
      <span class="guide line cap" :style="{ top: `${metrics.baseline - metrics.capHeight}px` }" />
      <span class="guide line xh" :style="{ top: `${metrics.baseline - metrics.xHeight}px` }" />
      <span class="guide line base" :style="{ top: `${metrics.baseline}px` }" />
    </template>
  </div>
</template>

<style scoped>
.preview {
  position: relative;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

/* Real CSS zoom (not a transform) so layout space is reserved at 2× too. */
.preview.zoomed {
  zoom: 2;
}

.frame {
  flex: none;
  display: block;
  position: relative;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.zoomed .frame img {
  image-rendering: pixelated;
}

.frame.empty {
  border: 1px dashed #bbb;
}

.zoomed .frame.empty {
  border-width: 0.5px;
}

.frame:not(.empty):hover {
  outline: 1px dashed #bbb;
}

.frame.empty:hover {
  border-color: #000;
}

.label {
  color: #000;
  outline: none;
  cursor: text;
  min-width: 1ch;
  text-decoration: underline transparent;
  text-underline-offset: 0.2em;
  transition: text-decoration-color 0.15s;
}

.label:hover {
  text-decoration-color: #ccc;
}

.label:focus {
  text-decoration-color: #000;
}

.guide {
  position: absolute;
  pointer-events: none;
}

.frame-outline {
  left: 0;
  top: 0;
  outline: 0.5px dashed #888;
}

.line {
  left: 0;
  right: 0;
  height: 0;
  border-top: 0.5px solid;
}

.line.center {
  border-top-style: dashed;
  border-color: var(--guide-center);
}
.line.cap {
  border-color: var(--guide-cap);
}
.line.xh {
  border-color: var(--guide-xh);
}
.line.base {
  border-color: var(--guide-base);
}
</style>
