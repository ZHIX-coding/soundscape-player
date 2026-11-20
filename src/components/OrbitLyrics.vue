<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LyricWords from './LyricWords.vue'

const props = defineProps({
  lyrics: { type: Array, required: true },
  active: { type: Number, required: true },
  wordIndex: { type: Number, required: true },
  seekVersion: { type: Number, required: true },
  playing: Boolean,
  resting: Boolean,
  reduceMotion: Boolean,
})
const emit = defineEmits(['surface', 'browse', 'jump'])
const surface = ref(null)
const onscreen = computed(() =>
  props.active < 0
    ? []
    : props.lyrics.slice(Math.max(0, props.active - 2), props.active + 3).map((line, i) => {
        const index = Math.max(0, props.active - 2) + i
        return { line, index, slot: index - props.active }
      }),
)
const trajectory = computed(() => {
  const current = props.lyrics[props.active]
  const next = props.lyrics[props.active + 1]
  return current && next && next.start - current.start < 2.4 ? 'quick' : 'steady'
})
const dimensions = ref({ width: 0, height: 0 })
let resize
let canvas
const pointer = ref(null)
const fontSizes = new Map()

function fontSize(line) {
  const { width, height } = dimensions.value
  if (!width || !height || !canvas) return undefined
  const key = width + '/' + height + '/' + line.text
  if (fontSizes.has(key)) return fontSizes.get(key)
  const narrow = matchMedia('(max-width: 720px)').matches
  const available = Math.floor(width * (narrow ? 0.92 : 0.69))
  const max = Math.max(
    29,
    Math.min(narrow ? 62 : 136, width * (narrow ? 0.16 : 0.106), height * 0.205),
  )
  const tokens = line.text.match(
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|\s+|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu,
  ) ?? [line.text]
  const family = getComputedStyle(surface.value).fontFamily
  let px = Math.floor(max)
  for (; px > 19; px -= 1) {
    canvas.font = `760 ${px}px ${family}`
    let row = ''
    let rows = 1
    for (const token of tokens) {
      if (canvas.measureText(row + token).width > available - 6 && row.trim()) {
        rows++
        row = token.trimStart()
      } else row += token
    }
    if (rows <= 2 && px * 1.12 * rows <= height * 0.3) break
  }
  fontSizes.set(key, px + 'px')
  return fontSizes.get(key)
}

const moving = ref(false)
watch(
  [() => props.active, () => props.seekVersion, () => props.reduceMotion, () => props.playing],
  ([index, seek, reduced], [old, oldSeek]) => {
    moving.value = index === old + 1 && old >= 0 && seek === oldSeek && props.playing && !reduced
  },
)
function touchMove(event) {
  if (event.touches.length !== 1 || pointer.value === null) return
  const touch = event.touches[0]
  const dy = Math.abs(touch.clientY - pointer.value.y)
  if (dy > 12 && dy > Math.abs(touch.clientX - pointer.value.x)) emit('browse')
}

function keyboard(event) {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) {
    event.preventDefault()
    emit('browse')
  }
}
onMounted(() => {
  canvas = document.createElement('canvas').getContext('2d')
  resize = new ResizeObserver(([entry]) => {
    fontSizes.clear()
    dimensions.value = { width: entry.contentRect.width, height: entry.contentRect.height }
  })
  resize.observe(surface.value)
  emit('surface', surface.value)
})
onBeforeUnmount(() => resize?.disconnect())
</script>

<template>
  <div
    ref="surface"
    class="orbit-lyrics"
    :class="{ 'orbit-moving': moving, 'lyrics-resting': resting }"
    :data-trajectory="trajectory"
    role="region"
    tabindex="0"
    aria-label="同步歌词"
    @wheel.passive="Math.abs($event.deltaY) > Math.abs($event.deltaX) && emit('browse')"
    @touchstart.passive="pointer = { x: $event.touches[0].clientX, y: $event.touches[0].clientY }"
    @touchmove.passive="touchMove"
    @keydown="keyboard"
  >
    <button
      v-for="{ line, index, slot } in onscreen"
      :key="index"
      class="orbit-line"
      :class="{ now: slot === 0, 'phrase-arrival': slot === 0 && moving && !line.words }"
      :data-slot="slot"
      :style="{ '--orbit-font': fontSize(line) }"
      :tabindex="resting || Math.abs(slot) > 1 ? -1 : undefined"
      :aria-hidden="resting || Math.abs(slot) > 1 || undefined"
      :aria-current="slot === 0 ? 'true' : undefined"
      :aria-label="line.text"
      @click="emit('jump', line.start)"
    >
      <LyricWords :line="line" :word-index="wordIndex" :timed="slot === 0" />
    </button>
  </div>
</template>
