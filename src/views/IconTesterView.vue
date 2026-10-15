<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import IconRow from '@/components/IconRow.vue'
import { FONT_FILE_ACCEPT, isFontFile, useFonts, type StoredFont } from '@/composables/useFonts'
import {
  fileClear,
  fileDelete,
  fileGet,
  fileSet,
  jsonLoad,
  jsonRemove,
  jsonSave,
} from '@/composables/useLocalStore'

type IconSize = 24 | 64

interface Line {
  id: string
  label: string
  hasIcon: boolean
}

interface PersistedState {
  iconSize: IconSize
  fontId: string
  /** label font size ÷ icon size — keeps the pairing when switching 24 ↔ 64 */
  ratio: number
  guides: boolean
  customFonts: StoredFont[]
  lines: Line[]
}

const STORAGE_KEY = 'icon-tester:v1'
const DEFAULT_LABEL = 'Icon Label'
// 16px label next to a 24px icon is the common pairing (Material, Apple HIG).
const DEFAULT_RATIO = 16 / 24

const newLine = (): Line => ({ id: crypto.randomUUID(), label: DEFAULT_LABEL, hasIcon: false })

const defaults = (): PersistedState => ({
  iconSize: 24,
  fontId: 'helvetica',
  ratio: DEFAULT_RATIO,
  guides: true,
  customFonts: [],
  lines: [newLine()],
})

const state = reactive<PersistedState>({ ...defaults(), ...jsonLoad<PersistedState>(STORAGE_KEY) })
if (!state.lines.length) state.lines.push(newLine())

watch(state, () => jsonSave(STORAGE_KEY, state), { deep: true })

const { allFonts, fontsVersion, loadFontFile, restoreFonts, measure } = useFonts()

/** Object URLs for icon blobs, keyed by line id. Not persisted — rebuilt from IndexedDB. */
const iconUrls = reactive(new Map<string, string>())

// ---- derived sizes ----------------------------------------------------------

const fontSize = computed(() => Math.round(state.ratio * state.iconSize))
// A third of the icon size: 8px at 24px, the standard icon–label gap.
const gap = computed(() => Math.round(state.iconSize / 3))
const currentFont = computed(
  () => allFonts.value.find((f) => f.id === state.fontId) ?? allFonts.value[0]!,
)
const metrics = computed(() => {
  void fontsVersion.value
  return measure(currentFont.value.stack, fontSize.value, state.iconSize)
})

function setFontSize(value: number) {
  if (!Number.isFinite(value) || value <= 0) return
  state.ratio = Math.min(Math.max(Math.round(value), 4), 200) / state.iconSize
}

function onFontSizeInput(e: Event) {
  setFontSize(parseFloat((e.target as HTMLInputElement).value))
}

// ---- lines ------------------------------------------------------------------

function addLine() {
  state.lines.push(newLine())
}

async function removeLine(line: Line) {
  state.lines = state.lines.filter((l) => l.id !== line.id)
  const url = iconUrls.get(line.id)
  if (url) URL.revokeObjectURL(url)
  iconUrls.delete(line.id)
  await fileDelete(`icon:${line.id}`)
}

function showIcon(id: string, blob: Blob) {
  const old = iconUrls.get(id)
  if (old) URL.revokeObjectURL(old)
  iconUrls.set(id, URL.createObjectURL(blob))
}

async function uploadIcon(line: Line, file: File) {
  showIcon(line.id, file)
  line.hasIcon = true
  await fileSet(`icon:${line.id}`, file)
}

// ---- fonts ------------------------------------------------------------------

const fontInput = ref<HTMLInputElement | null>(null)
const fontError = ref<string | null>(null)
const pageDragging = ref(false)

async function addFont(file: File) {
  fontError.value = null
  try {
    const font = await loadFontFile(file)
    state.customFonts.push({ id: font.id, label: font.label })
    state.fontId = font.id
  } catch {
    fontError.value = `Couldn’t read “${file.name}”. Use a .ttf, .otf, .woff or .woff2 file.`
  }
}

function onFontFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) addFont(file)
  input.value = ''
}

function onPageDragOver(e: DragEvent) {
  if (e.dataTransfer?.types.includes('Files')) {
    e.preventDefault()
    pageDragging.value = true
  }
}

function onPageDrop(e: DragEvent) {
  pageDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (!file) return
  e.preventDefault()
  if (isFontFile(file)) addFont(file)
}

// ---- restore & reset --------------------------------------------------------

onMounted(async () => {
  state.customFonts = await restoreFonts(state.customFonts)
  if (!allFonts.value.some((f) => f.id === state.fontId)) state.fontId = 'helvetica'

  for (const line of state.lines) {
    if (!line.hasIcon) continue
    const blob = await fileGet<Blob>(`icon:${line.id}`)
    if (blob) showIcon(line.id, blob)
    else line.hasIcon = false
  }

  await document.fonts.ready
  fontsVersion.value++
})

async function reset() {
  if (!confirm('Remove all lines, icons and uploaded fonts from this browser?')) return
  jsonRemove(STORAGE_KEY)
  await fileClear()
  location.reload()
}
</script>

<template>
  <div
    class="page"
    :class="{ dragging: pageDragging }"
    @dragover="onPageDragOver"
    @dragleave.self="pageDragging = false"
    @drop="onPageDrop"
  >
    <header class="top">
      <h1>Icon Tester</h1>

      <div class="controls">
        <div class="control">
          <span class="control-label" id="lbl-typeface">Typeface</span>
          <div class="control-row">
            <label class="pill select">
              <select v-model="state.fontId" aria-labelledby="lbl-typeface">
                <optgroup label="System">
                  <option v-for="f in allFonts.filter((f) => !f.custom)" :key="f.id" :value="f.id">
                    {{ f.label }}
                  </option>
                </optgroup>
                <optgroup v-if="state.customFonts.length" label="Uploaded">
                  <option v-for="f in allFonts.filter((f) => f.custom)" :key="f.id" :value="f.id">
                    {{ f.label }}
                  </option>
                </optgroup>
              </select>
            </label>
            <button type="button" class="pill" @click="fontInput?.click()">Upload font</button>
            <input
              ref="fontInput"
              type="file"
              :accept="FONT_FILE_ACCEPT"
              hidden
              @change="onFontFileChange"
            />
          </div>
        </div>

        <div class="control">
          <span class="control-label" id="lbl-font-size">Font size</span>
          <div class="pill stepper" role="group" aria-labelledby="lbl-font-size">
            <button type="button" aria-label="Smaller" @click="setFontSize(fontSize - 1)">–</button>
            <input
              type="number"
              step="1"
              min="4"
              :value="fontSize"
              aria-label="Font size in px"
              @change="onFontSizeInput"
            />
            <span class="unit">px</span>
            <button type="button" aria-label="Larger" @click="setFontSize(fontSize + 1)">+</button>
          </div>
        </div>

        <div class="control">
          <span class="control-label" id="lbl-icon-size">Icon size</span>
          <div class="segmented" role="group" aria-labelledby="lbl-icon-size">
            <button
              v-for="s in [24, 64] as const"
              :key="s"
              type="button"
              class="pill"
              :class="{ active: state.iconSize === s }"
              @click="state.iconSize = s"
            >
              {{ s }}px
            </button>
          </div>
        </div>

        <div class="control">
          <span class="control-label">Guides</span>
          <button
            type="button"
            class="pill"
            :class="{ active: state.guides }"
            :aria-pressed="state.guides"
            @click="state.guides = !state.guides"
          >
            {{ state.guides ? 'On' : 'Off' }}
          </button>
        </div>
      </div>
    </header>

    <p v-if="fontError" class="error">{{ fontError }}</p>

    <div class="list-head">
      <span>Preview</span>
      <span class="zoom-head">
        200% zoom
        <small>
          Magnified to check alignment — this is not the actual size. Raster icons are expected to
          look soft or pixelated here.
        </small>
      </span>
      <span />
    </div>

    <ol class="list">
      <IconRow
        v-for="line in state.lines"
        :key="line.id"
        :label="line.label"
        :icon-url="iconUrls.get(line.id) ?? null"
        :size="state.iconSize"
        :font-size="fontSize"
        :font-stack="currentFont.stack"
        :gap="gap"
        :guides="state.guides"
        :metrics="metrics"
        :can-remove="state.lines.length > 1"
        @update:label="line.label = $event"
        @upload="uploadIcon(line, $event)"
        @remove="removeLine(line)"
      />
    </ol>

    <footer class="bottom">
      <button type="button" class="pill round add" aria-label="Add line" title="Add line" @click="addLine">
        <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
          <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.3" />
        </svg>
      </button>
      <span class="footnote">
        Icons and fonts stay in this browser — nothing is uploaded.
        <button type="button" class="link" @click="reset">Reset</button>
      </span>
    </footer>
  </div>
</template>

<style scoped>
.page {
  --grid-cols: minmax(0, 1fr) minmax(0, 2fr) 26px;
  min-height: 100vh;
  padding: 32px 40px 64px;
  max-width: 1400px;
  margin: 0 auto;
}

.page.dragging {
  outline: 2px dashed #000;
  outline-offset: -12px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 72px;
}

h1 {
  margin: 0;
  font-size: 40px;
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: flex-end;
  gap: 16px 24px;
}

.control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.control-row {
  display: flex;
  gap: 8px;
}

.select {
  position: relative;
  padding: 0;
}

.select select {
  appearance: none;
  border: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  padding: 7px 30px 7px 14px;
  border-radius: 999px;
  cursor: pointer;
}

.select::after {
  content: '';
  position: absolute;
  right: 13px;
  top: 50%;
  width: 5px;
  height: 5px;
  border-right: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  transform: translateY(-70%) rotate(45deg);
  pointer-events: none;
}

.stepper {
  display: inline-flex;
  align-items: center;
  padding: 0 4px;
}

.stepper button {
  border: 0;
  background: none;
  font: inherit;
  width: 26px;
  height: 30px;
  cursor: pointer;
  border-radius: 999px;
}

.stepper button:hover {
  background: #f0f0f0;
}

.stepper input {
  width: 3.2em;
  border: 0;
  font: inherit;
  text-align: right;
  background: transparent;
  -moz-appearance: textfield;
}

.stepper input::-webkit-inner-spin-button,
.stepper input::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

.stepper .unit {
  margin-left: 2px;
  color: #888;
}

.segmented {
  display: inline-flex;
}

.segmented .pill:first-child {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.segmented .pill:last-child {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin-left: -1px;
}

.error {
  margin: 16px 0 0;
  font-size: 13px;
  color: #c00;
}

.list-head {
  display: grid;
  grid-template-columns: var(--grid-cols);
  gap: 24px;
  padding-bottom: 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  align-items: start;
}

.zoom-head small {
  display: block;
  margin-top: 4px;
  text-transform: none;
  letter-spacing: 0;
  color: #888;
  line-height: 1.4;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-bottom: 1px solid #000;
}

.bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.add {
  width: 40px;
  height: 40px;
}

.footnote {
  font-size: 11px;
  color: #888;
}

.link {
  border: 0;
  background: none;
  font: inherit;
  color: #000;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  margin-left: 6px;
}

@media (max-width: 760px) {
  .page {
    padding: 20px 16px 48px;
  }
  .controls {
    justify-content: flex-start;
  }
  .list-head {
    display: none;
  }
}
</style>
