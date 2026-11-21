<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { usePlayer } from '../stores/music'
import { useAppearance } from '../stores/appearance'

const p = usePlayer()
const appearance = useAppearance()
const screen = ref(null)
const emit = defineEmits(['palette'])
const motion = matchMedia('(prefers-reduced-motion: reduce)')
let hue = 176,
  width = 0,
  height = 0,
  frame,
  last = 0,
  observer,
  version = 0
const room = new Image()
room.src = import.meta.env.BASE_URL + 'media/listening-room.webp'
const dust = Array.from({ length: 110 }, (_, i) => ({
  x: ((i + 1) * 0.61803398875) % 1,
  y: ((i + 1) * 0.75487766625) % 1,
  depth: ((i + 1) * 0.56984029099) % 1,
}))
const tone = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`
async function lightPalette(url) {
  const current = ++version
  hue = 176
  emit('palette', '214, 226, 211')
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = url
  try {
    await image.decode()
    if (current !== version) return
    const tile = document.createElement('canvas')
    tile.width = tile.height = 16
    const ctx = tile.getContext('2d')
    ctx.drawImage(image, 0, 0, 16, 16)
    const pixels = ctx.getImageData(0, 0, 16, 16).data
    let x = 0,
      y = 0
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b] = pixels.subarray(i, i + 3)
      x += 2 * r - g - b
      y += Math.sqrt(3) * (g - b)
    }
    if (Math.hypot(x, y) > 100) hue = (Math.atan2(y, x) * 180) / Math.PI
    const rgb = [0, 1, 2].map((i) =>
      Math.round(211 + 22 * Math.cos((hue * Math.PI) / 180 - (i * 2 * Math.PI) / 3)),
    )
    emit('palette', rgb.join(', '))
  } catch {
    /* Neutral stage lighting also works with missing artwork. */
  }
  if (current === version) restart()
}

// Each strand follows the same flowing sheet. Varying its phase across the
// sheet creates folded edges and bright caustics where the strands converge.
function curtain(ctx, t, shot, pulse, upper) {
  const n = width < 650 ? 78 : 114
  const color = ctx.createLinearGradient(0, 0, width, height * 0.17)
  color.addColorStop(0, tone(hue + 14, 65, 62, 0.65))
  color.addColorStop(0.35, tone(hue + 39, 48, 78, 0.32))
  color.addColorStop(0.6, tone(hue - 62, 65, 70, 0.38))
  color.addColorStop(1, tone(hue - 97, 78, 68, 0.78))
  ctx.strokeStyle = color
  for (let k = 0; k < n; k++) {
    const v = k / (n - 1),
      phase = t * 0.23 + (upper ? 2.6 : 0)
    const folded = Math.sin(v * 6.2 + phase * 0.52)
    ctx.globalAlpha = (0.27 + 0.66 * Math.pow(0.5 + 0.5 * folded, 2)) * (0.84 + pulse * 0.16)
    ctx.lineWidth = (k % 9 === 0 ? 1.5 : 0.76) * Math.min(1.25, width / 570 + 0.32)
    ctx.beginPath()
    for (let j = 0; j <= 54; j++) {
      const u = j / 54
      const sweep = Math.sin(u * 6.1 + phase * 0.58 + v * 1.18 + shot * 0.32)
      const curl = Math.sin(u * 10.8 - phase * 0.48 + v * 3.65)
      const edge = Math.pow(Math.abs(2 * u - 1), 1.5)
      const base = upper ? 0.1 : 0.82
      const y =
        base +
        (upper ? -1 : 1) *
          (0.1 * sweep + 0.066 * curl + 0.11 * (v - 0.5) + 0.07 * folded * sweep - edge * 0.095)
      if (j === 0) ctx.moveTo(-2, y * height)
      else ctx.lineTo(u * (width + 4) - 2, y * height)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}
function tunnel(ctx, t, shot, pulse) {
  const cx = width * (0.5 + 0.09 * shot),
    cy = height * (0.46 + 0.05 * Math.sin(t * 0.27))
  const extent = Math.hypot(width, height)
  ctx.globalCompositeOperation = 'screen'
  for (let layer = 0; layer < 32; layer++) {
    const z = ((layer + t * 0.85) % 32) / 32
    const radius = extent * 0.047 * Math.exp(z * 3.22)
    const turn = z * 1.32 + 0.34 * Math.sin(t * 0.17 + z * 3) + shot * 0.15
    const alpha = 0.04 + 0.67 * z * z
    ctx.beginPath()
    for (let side = 0; side <= 6; side++) {
      const angle = (side * Math.PI) / 3 + turn
      const x = cx + radius * Math.cos(angle)
      const y = cy + radius * 0.79 * Math.sin(angle)
      if (side === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    const h = hue + 38 + z * 126
    ctx.strokeStyle = tone(h, 80, 57, alpha * 0.15)
    ctx.lineWidth = 4 + z * 8
    ctx.stroke()
    ctx.strokeStyle = tone(h, 80, 75, alpha * (0.78 + pulse * 0.22))
    ctx.lineWidth = 0.6 + z * 1.4
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}
function draw() {
  const ctx = screen.value?.getContext('2d')
  if (!ctx || !width || !height) return
  const still = appearance.reduceMotion || motion.matches
  const t = still ? 0 : p.mediaTime()
  const lines = p.song.lyrics
  const idx = lines.findLastIndex((line) => line.start <= t)
  const cue = idx < 0 ? Math.floor(t / 5) : idx
  const age = t - (lines[idx]?.start ?? cue * 5)
  const pulse = still ? 0 : Math.exp(-Math.max(0, age) * 1.65)
  const shot = Math.sin(cue * 1.87) * (1 - pulse) + Math.sin(Math.max(0, cue - 1) * 1.87) * pulse
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = '#090710'
  ctx.fillRect(0, 0, width, height)
  if (room.complete && room.naturalWidth) {
    const scale = Math.max(width / room.width, height / room.height) * 1.07
    const w = room.width * scale,
      h = room.height * scale
    ctx.globalAlpha = appearance.scene === '激光隧道' ? 0.14 : 0.42
    ctx.drawImage(room, (width - w) * (0.64 + shot * 0.1), (height - h) * 0.5, w, h)
    ctx.globalAlpha = 1
  }
  function glow(x, y, r, h, a) {
    const gradient = ctx.createRadialGradient(x * width, y * height, 0, x * width, y * height, r)
    gradient.addColorStop(0, tone(h, 65, 51, a))
    gradient.addColorStop(0.42, tone(h, 63, 35, a * 0.47))
    gradient.addColorStop(1, tone(h, 60, 19, 0))
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
  const size = Math.max(width * 0.65, height * 0.68)
  glow(0.04, 0.3, size, hue + 20, 0.31)
  glow(0.92, 0.65, size * 0.86, hue - 98, 0.38)
  if (appearance.scene === '激光隧道') {
    tunnel(ctx, t, shot, pulse)
    return
  }
  ctx.globalCompositeOperation = 'screen'
  // Two overhead lighting rigs, each projecting a fan through the haze.
  for (let rig = 0; rig < 2; rig++) {
    ctx.save()
    ctx.translate(width * (rig ? 0.94 : 0.07), -height * 0.05)
    ctx.scale(width, height)
    for (let i = 0; i < 6; i++) {
      const pivot = (rig ? -1 : 1) * (0.12 + i * 0.094 + 0.09 * Math.sin(t * 0.36 + rig + shot))
      const beam = ctx.createLinearGradient(0, 0, pivot, 0.82)
      beam.addColorStop(0, tone(rig ? hue - 82 : hue + 22, 58, 80, 0.13 + 0.18 * pulse))
      beam.addColorStop(0.58, tone(hue + 10, 40, 65, 0.032))
      beam.addColorStop(1, 'transparent')
      ctx.fillStyle = beam
      ctx.beginPath()
      ctx.moveTo(-0.002, 0)
      ctx.lineTo(pivot - 0.019, 0.86)
      ctx.lineTo(pivot + 0.032, 0.86)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
  curtain(ctx, t, shot, pulse, true)
  curtain(ctx, t, shot, pulse, false)
  for (const mote of dust) {
    const x = ((mote.x + t * (0.001 + mote.depth * 0.004)) % 1) * width
    const y = (mote.y + Math.sin(t * 0.8 + mote.x * 18) * 0.014) * height
    const illuminated = 0.25 + 0.75 * Math.abs(2 * mote.x - 1)
    ctx.fillStyle = tone(hue - 42, 64, 81, illuminated * (0.12 + mote.depth * 0.31))
    ctx.beginPath()
    ctx.arc(x, y, 0.32 + mote.depth * 0.86, 0, 2 * Math.PI)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
}
function animate(now) {
  if (now - last >= 1000 / 30) {
    draw()
    last = now
  }
  frame = requestAnimationFrame(animate)
}
function restart() {
  cancelAnimationFrame(frame)
  if (document.hidden || !screen.value) return
  draw()
  if (p.playing && !appearance.reduceMotion && !motion.matches)
    frame = requestAnimationFrame(animate)
}
function resize() {
  const el = screen.value,
    dpr = Math.min(devicePixelRatio, 1.5, 1800 / Math.max(1, el.clientWidth))
  width = el.clientWidth
  height = el.clientHeight
  el.width = Math.round(width * dpr)
  el.height = Math.round(height * dpr)
  el.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
  restart()
}
watch(() => p.song.cover, lightPalette)
watch([() => p.playing, () => appearance.reduceMotion, () => appearance.scene], restart)
watch(
  () => p.position,
  () => {
    if (!p.playing) restart()
  },
)
onMounted(() => {
  room.addEventListener('load', restart)
  observer = new ResizeObserver(resize)
  observer.observe(screen.value)
  motion.addEventListener('change', restart)
  document.addEventListener('visibilitychange', restart)
  lightPalette(p.song.cover)
})
onUnmounted(() => {
  room.removeEventListener('load', restart)
  version++
  observer.disconnect()
  cancelAnimationFrame(frame)
  motion.removeEventListener('change', restart)
  document.removeEventListener('visibilitychange', restart)
})
</script>
<template>
  <canvas ref="screen" class="cover-scene concert-canvas" aria-hidden="true"></canvas>
</template>
