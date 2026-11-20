<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  cover: { type: String, required: true },
  reduceMotion: Boolean,
})
const emit = defineEmits(['cover-load'])
const root = ref(null)
const artwork = ref(null)
const canvas = ref(null)
const rendered = ref(false)
const motion = matchMedia('(prefers-reduced-motion: reduce)')
let resize
let frame

function loaded(event) {
  emit('cover-load', event)
  refresh()
}

function refresh() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(draw)
}

function draw() {
  const img = artwork.value
  const target = canvas.value
  if (!img?.naturalWidth || !target || props.reduceMotion || motion.matches) {
    rendered.value = false
    return
  }
  const box = root.value
  const ctx = target.getContext('2d', { alpha: false })
  if (!ctx || !box.clientWidth || !box.clientHeight) return
  const px = Math.min(1, 1152 / box.clientWidth, 820 / box.clientHeight)
  const width = Math.round(box.clientWidth * px)
  const height = Math.round(box.clientHeight * px)
  target.width = width
  target.height = height
  const zoom = Math.max(width / img.naturalWidth, height / img.naturalHeight)
  const cropWidth = width / zoom
  const cropHeight = height / zoom
  const left = (img.naturalWidth - cropWidth) * 0.48
  const top = (img.naturalHeight - cropHeight) * 0.43
  const bands = Math.max(1, Math.min(160, Math.ceil(width / 5)))
  const narrow = box.clientWidth < 620
  for (let i = 0; i < bands; i++) {
    const u = i / bands
    const edge = Math.max(0, Math.abs(u - 0.5) - 0.1) / 0.4
    const refract = edge ** 1.55 * (narrow ? 0.55 : 1)
    const dy = (Math.sin(i * 0.45) * 0.038 + Math.sin(i * 1.37) * 0.021) * height * refract
    const dx = Math.sin(i * 1.51) * cropWidth * refract * 0.016
    const a = Math.round(u * width)
    const b = Math.round(((i + 1) * width) / bands)
    const sw = cropWidth / bands
    const sx = Math.max(0, Math.min(img.naturalWidth - sw, left + u * cropWidth + dx))
    ctx.drawImage(img, sx, top, sw, cropHeight, a, dy - 6, b - a, height + 12)
    if (dy > 6) ctx.drawImage(img, sx, top, sw, 1, a, 0, b - a, dy - 5)
    if (dy < -6)
      ctx.drawImage(img, sx, top + cropHeight - 1, sw, 1, a, height + dy + 5, b - a, -dy - 5)
  }
  rendered.value = true
}

watch(
  () => props.cover,
  () => {
    rendered.value = false
  },
)
watch(() => props.reduceMotion, refresh)
onMounted(() => {
  resize = new ResizeObserver(refresh)
  resize.observe(root.value)
  motion.addEventListener('change', refresh)
  refresh()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  resize?.disconnect()
  motion.removeEventListener('change', refresh)
})
</script>

<template>
  <div ref="root" class="orbit-art" aria-hidden="true">
    <img :key="cover" ref="artwork" :src="cover" alt="" @load="loaded" />
    <canvas ref="canvas" :class="{ refracted: rendered }" />
    <i class="orbit-grain orbit-grain-top"></i>
    <i class="orbit-grain orbit-grain-bottom"></i>
    <i class="orbit-arc"></i>
  </div>
</template>
