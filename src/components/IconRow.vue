<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IconPreview from './IconPreview.vue'
import type { FontMetrics } from '@/composables/useFonts'

const props = defineProps<{
  label: string
  iconUrl: string | null
  size: number
  fontSize: number
  fontStack: string
  gap: number
  guides: boolean
  metrics: FontMetrics | null
  canRemove: boolean
}>()

const emit = defineEmits<{
  'update:label': [value: string]
  upload: [file: File]
  remove: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const natural = ref<{ w: number; h: number } | null>(null)

watch(
  () => props.iconUrl,
  (url) => {
    natural.value = null
    if (!url) return
    const img = new Image()
    img.onload = () => {
      if (props.iconUrl === url) natural.value = { w: img.naturalWidth, h: img.naturalHeight }
    }
    img.src = url
  },
  { immediate: true },
)

const sourceNote = computed(() => {
  const n = natural.value
  if (!n) return null
  const frame = `${props.size}×${props.size}`
  if (n.w !== n.h) return `Source ${n.w}×${n.h} is not square — fitted into ${frame} frame`
  if (n.w === props.size) return null
  if (n.w === props.size * 2) return `Source ${n.w}×${n.h} (@2x) — shown at ${frame}`
  return `Source ${n.w}×${n.h} — scaled to ${frame}`
})

function isImage(file: File) {
  return file.type === 'image/png' || file.type === 'image/jpeg'
}

function pick() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file && isImage(file)) emit('upload', file)
  input.value = ''
}

function onDragOver(e: DragEvent) {
  if (e.dataTransfer?.types.includes('Files')) {
    e.preventDefault()
    dragging.value = true
  }
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && isImage(file)) {
    e.preventDefault()
    e.stopPropagation()
    emit('upload', file)
  }
  // anything else (e.g. a font file) bubbles up to the page-level drop handler
}
</script>

<template>
  <li
    class="row"
    :class="{ dragging }"
    @dragover="onDragOver"
    @dragleave="dragging = false"
    @drop="onDrop"
  >
    <div class="cell actual">
      <IconPreview
        :icon-url="iconUrl"
        :label="label"
        :size="size"
        :font-size="fontSize"
        :font-stack="fontStack"
        :gap="gap"
        @update:label="emit('update:label', $event)"
        @pick="pick"
      />
      <span v-if="sourceNote" class="note">{{ sourceNote }}</span>
    </div>

    <div class="cell zoom">
      <IconPreview
        :icon-url="iconUrl"
        :label="label"
        :size="size"
        :font-size="fontSize"
        :font-stack="fontStack"
        :gap="gap"
        :guides="guides"
        :metrics="metrics"
        zoomed
        @update:label="emit('update:label', $event)"
        @pick="pick"
      />
    </div>

    <div class="actions">
      <button
        v-if="canRemove"
        type="button"
        class="pill small round"
        title="Remove line"
        aria-label="Remove line"
        @click="emit('remove')"
      >
        <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/png,image/jpeg"
        hidden
        @change="onFileChange"
      />
    </div>
  </li>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: var(--grid-cols);
  align-items: center;
  gap: 24px;
  padding: 20px 0;
  border-top: 1px solid #000;
  transition: background 0.15s;
}

.row.dragging {
  background: #f3f3f3;
}

.cell {
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  /* Breathing room so the scroll container doesn't clip outlines drawn
     just outside the icon frame (hover state, guide frame). */
  padding: 8px;
  margin: -8px;
}

.actual {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.note {
  font-size: 11px;
  color: #888;
}

.actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

@media (max-width: 760px) {
  .row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px 16px;
  }
  .zoom {
    grid-column: 1;
  }
  .actions {
    grid-row: 1;
    grid-column: 2;
  }
}
</style>
