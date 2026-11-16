<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { usePlayer } from '../stores/music'
import { useAppearance } from '../stores/appearance'

const p = usePlayer()
const appearance = useAppearance()
const canvas = ref(null)
const emit = defineEmits(['palette'])
const motion = matchMedia('(prefers-reduced-motion: reduce)')
let layers = []
let ink = '220, 216, 173'
let observer,
  frame,
  loadVersion = 0
let width = 0,
  height = 0,
  lastFrame = 0

// Sample the artwork once. Separate translucent plates can then move at
// different depths without reading pixels or iterating each dot per frame.
async function sampleCover(url) {
  const version = ++loadVersion
  layers = []
  ink = '220, 216, 173'
  emit('palette', ink)
  redraw()
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = url
  try {
    await image.decode()
    if (version !== loadVersion) return
    const grid = 168
    const sample = document.createElement('canvas')
    sample.width = sample.height = grid
    const ctx = sample.getContext('2d', { willReadFrequently: true })
    const side = Math.min(image.width, image.height)
    ctx.drawImage(
      image,
      (image.width - side) / 2,
      (image.height - side) / 2,
      side,
      side,
      0,
      0,
      grid,
      grid,
    )
    const data = ctx.getImageData(0, 0, grid, grid).data
    const plates = Array.from({ length: 5 }, () => {
      const plate = document.createElement('canvas')
      plate.width = plate.height = grid * 4
      return plate
    })
    const pens = plates.map((plate) => plate.getContext('2d'))
    const luminance = (i) => 0.22 * data[i] + 0.68 * data[i + 1] + 0.1 * data[i + 2]
    const values = Array.from({ length: grid * grid }, (_, n) => luminance(n * 4)).sort(
      (a, b) => a - b,
    )
    const floor = values[Math.floor(values.length * 0.3)]
    const range = Math.max(20, values[Math.floor(values.length * 0.98)] - floor)
    const tint = [0, 0, 0]
    let total = 0
    for (let y = 1; y < grid - 1; y++) {
      for (let x = 1; x < grid - 1; x++) {
        const i = (y * grid + x) * 4
        const light = luminance(i)
        const edge = Math.min(
          1,
          (Math.abs(light - luminance(i - 4)) + Math.abs(light - luminance(i - grid * 4))) / 52,
        )
        const relief = Math.max(0, Math.min(1, (light - floor) / range))
        const strength = Math.max(relief, edge * 0.8)
        if (strength < 0.14 || data[i + 3] < 32) continue
        const pen = pens[Math.min(4, Math.floor(strength * 5))]
        const color = [0, 1, 2].map((k) => Math.min(255, Math.round(data[i + k] * 1.14 + 26)))
        pen.fillStyle = 'rgba(' + color.join(',') + ',' + (0.2 + strength * 0.78) + ')'
        pen.beginPath()
        pen.arc(x * 4 + (y % 2), y * 4, 0.56 + strength * 1.13, 0, Math.PI * 2)
        pen.fill()
        if (strength > 0.76) {
          total++
          color.forEach((v, k) => (tint[k] += v))
        }
      }
    }
    layers = plates
    if (total) ink = tint.map((v) => Math.round(55 + (0.78 * v) / total)).join(', ')
    emit('palette', ink)
    redraw()
  } catch {
    // The ordinary cover backdrop and lyric controls also work without pixel access.
  }
}

function draw() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx || !width || !height) return
  ctx.clearRect(0, 0, width, height)
  const compact = width < 640
  const still = appearance.reduceMotion || motion.matches
  const t = still ? 0 : p.mediaTime()
  const lines = p.song.lyrics
  const cue = lines.findLastIndex((line) => line.start <= t)
  const index = lines.length ? Math.max(0, cue) : Math.floor(t / 6)
  const elapsed = Math.max(0, t - (lines[cue]?.start ?? (lines.length ? 0 : index * 6)))
  // Travel between two poses at a line onset, then settle while the line is sung.
  const settle = Math.pow(1 - Math.min(elapsed / 1.05, 1), 3)
  const shot = still
    ? 0
    : Math.sin(index * 2.1) * (1 - settle) + Math.sin(Math.max(0, index - 1) * 2.1) * settle
  const sway = still ? 0 : Math.sin(t * 0.36)
  const size = compact
    ? Math.min(width * 1.09, height * 0.66)
    : Math.min(width * 0.56, height * 0.94)
  const cx = compact ? width * 0.25 : width * 0.23
  const cy = compact ? height * 0.25 : height * 0.41
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-0.12 + shot * 0.065 + sway * 0.014)
  for (const [i, plate] of layers.entries()) {
    const depth = (i + 1) / 5
    const scale = size * (1 + depth * (shot * 0.095 + sway * 0.022))
    ctx.drawImage(
      plate,
      -scale / 2 + shot * size * 0.044 * depth,
      -scale / 2 + sway * size * 0.012 * depth,
      scale,
      scale,
    )
  }
  ctx.restore()
  // Foreshortened contour lines share one surface. The wave travels across
  // the floor from the cover toward the lyrics after each recorded onset.
  for (let row = 0; row < 25; row++) {
    const z = (row + 1) / 25
    ctx.beginPath()
    for (let col = 0; col <= 96; col++) {
      const u = col / 96
      const ridge =
        Math.sin(8 * u + z * 3 + t * 0.29) * 0.024 + Math.sin(13 * u - z * 4 - t * 0.18) * 0.014
      const ripple = still
        ? 0
        : 0.025 *
          Math.exp(-3 * Math.pow(u * 2.3 - elapsed * 1.5, 2)) *
          Math.sin(9 * u - elapsed * 5)
      const y =
        height *
        ((compact ? 0.66 : 0.6) +
          0.37 * z * z +
          (ridge + ripple) * (0.35 + z) -
          0.075 * Math.cos(4 * u + z))
      if (col === 0) ctx.moveTo(0, y)
      else ctx.lineTo(u * width, y)
    }
    ctx.strokeStyle = 'rgba(' + ink + ',' + (0.065 + 0.15 * z) + ')'
    ctx.lineWidth = 0.55 + z * 0.45
    ctx.stroke()
  }
}
function animate(now) {
  if (now - lastFrame >= 1000 / 30) {
    draw()
    lastFrame = now
  }
  frame = requestAnimationFrame(animate)
}
function redraw() {
  cancelAnimationFrame(frame)
  if (!canvas.value || document.hidden) return
  draw()
  if (p.playing && !appearance.reduceMotion && !motion.matches)
    frame = requestAnimationFrame(animate)
}
function resize() {
  const surface = canvas.value
  width = surface.clientWidth
  height = surface.clientHeight
  const dpr = Math.min(devicePixelRatio || 1, 1.75)
  surface.width = Math.round(width * dpr)
  surface.height = Math.round(height * dpr)
  surface.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
  redraw()
}
watch(() => p.song.cover, sampleCover)
watch([() => p.playing, () => appearance.reduceMotion], redraw)
watch(
  () => p.position,
  () => {
    if (!p.playing && !appearance.reduceMotion && !motion.matches) redraw()
  },
)
onMounted(() => {
  observer = new ResizeObserver(resize)
  observer.observe(canvas.value)
  motion.addEventListener('change', redraw)
  document.addEventListener('visibilitychange', redraw)
  sampleCover(p.song.cover)
})
onUnmounted(() => {
  loadVersion++
  observer?.disconnect()
  cancelAnimationFrame(frame)
  motion.removeEventListener('change', redraw)
  document.removeEventListener('visibilitychange', redraw)
})
</script>
<template><canvas ref="canvas" class="cover-scene" aria-hidden="true"></canvas></template>
