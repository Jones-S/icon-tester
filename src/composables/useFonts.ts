import { computed, ref } from 'vue'
import { fileGet, fileSet } from './useLocalStore'

export interface FontOption {
  id: string
  label: string
  stack: string
  custom?: boolean
}

export interface StoredFont {
  id: string
  label: string
}

export interface FontMetrics {
  /** Distance from the top of the line box to the baseline, in px. */
  baseline: number
  capHeight: number
  xHeight: number
}

export const BUILTIN_FONTS: FontOption[] = [
  { id: 'helvetica', label: 'Helvetica', stack: 'Helvetica, "Helvetica Neue", Arial, sans-serif' },
  { id: 'arial', label: 'Arial', stack: 'Arial, sans-serif' },
  { id: 'times', label: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
]

export const FONT_FILE_ACCEPT = '.ttf,.otf,.woff,.woff2'

export function isFontFile(file: File): boolean {
  return /\.(ttf|otf|woff2?)$/i.test(file.name)
}

const customFonts = ref<FontOption[]>([])
/** Bumped whenever a font finishes loading so metrics get re-measured. */
const fontsVersion = ref(0)

function stackFor(id: string) {
  return `"${id}", Helvetica, Arial, sans-serif`
}

async function register(id: string, label: string, buffer: ArrayBuffer): Promise<FontOption> {
  const face = new FontFace(id, buffer)
  await face.load()
  document.fonts.add(face)
  const option: FontOption = { id, label, stack: stackFor(id), custom: true }
  customFonts.value.push(option)
  fontsVersion.value++
  return option
}

/** Loads a font file into this browser only. The file is kept in IndexedDB, never uploaded. */
async function loadFontFile(file: File): Promise<FontOption> {
  const buffer = await file.arrayBuffer()
  const id = `UserFont_${crypto.randomUUID().slice(0, 8)}`
  const label = file.name.replace(/\.[^.]+$/, '')
  const option = await register(id, label, buffer)
  await fileSet(`font:${id}`, buffer)
  return option
}

/** Re-registers fonts uploaded in an earlier visit. Returns the ones that could be restored. */
async function restoreFonts(stored: StoredFont[]): Promise<StoredFont[]> {
  const restored: StoredFont[] = []
  for (const font of stored) {
    const buffer = await fileGet<ArrayBuffer>(`font:${font.id}`)
    if (!buffer) continue
    try {
      await register(font.id, font.label, buffer)
      restored.push(font)
    } catch {
      // corrupt entry — skip it
    }
  }
  return restored
}

let canvas: HTMLCanvasElement | null = null

/** Measures where baseline, cap height and x-height sit inside a line box of `lineHeight`. */
function measure(stack: string, fontSize: number, lineHeight: number): FontMetrics | null {
  canvas ??= document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.font = `${fontSize}px ${stack}`
  const h = ctx.measureText('H')
  const x = ctx.measureText('x')
  const ascent = h.fontBoundingBoxAscent ?? fontSize * 0.8
  const descent = h.fontBoundingBoxDescent ?? fontSize * 0.2
  // CSS half-leading model: the content area is centred inside the line box.
  const baseline = (lineHeight - (ascent + descent)) / 2 + ascent
  return {
    baseline,
    capHeight: h.actualBoundingBoxAscent,
    xHeight: x.actualBoundingBoxAscent,
  }
}

export function useFonts() {
  const allFonts = computed(() => [...BUILTIN_FONTS, ...customFonts.value])
  return { allFonts, customFonts, fontsVersion, loadFontFile, restoreFonts, measure }
}
