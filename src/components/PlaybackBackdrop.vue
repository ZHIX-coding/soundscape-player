<script setup>
import PosterArtwork from './PosterArtwork.vue'
import AlbumBackdrop from './AlbumBackdrop.vue'
defineProps({
  cover: { type: String, required: true },
  mode: { type: String, required: true },
  reduceMotion: Boolean,
})

function sampleCover({ target: image }) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 24
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, 24, 24)
    const pixels = ctx.getImageData(0, 0, 24, 24).data
    const total = [0, 0, 0]
    const secondary = [0, 0, 0]
    let weights = 0
    let rightWeights = 0
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i],
        g = pixels[i + 1],
        b = pixels[i + 2]
      const high = Math.max(r, g, b)
      const low = Math.min(r, g, b)
      const alpha = pixels[i + 3] / 255
      const weight = alpha * (0.18 + (high - low) / 90) * (0.25 + Math.sin((high / 255) * Math.PI))
      total[0] += r * weight
      total[1] += g * weight
      total[2] += b * weight
      weights += weight
      if ((i / 4) % 24 >= 12) {
        secondary[0] += r * weight
        secondary[1] += g * weight
        secondary[2] += b * weight
        rightWeights += weight
      }
    }
    if (weights) {
      const color = total.map((channel) => Math.round(channel / weights)).join(' ')
      const layer = image.closest('.now-wash')
      layer.style.setProperty('--cover-color', 'rgb(' + color + ')')
      if (rightWeights) {
        const shade = secondary.map((channel) => Math.round(channel / rightWeights)).join(' ')
        layer.style.setProperty('--cover-shadow', 'rgb(' + shade + ')')
        layer.style.setProperty('--poster-accent', 'rgb(' + color + ')')
      }
    }
  } catch {
    // Images served without cross-origin pixel access can still be displayed.
  }
}
</script>

<template>
  <div class="now-backdrop" aria-hidden="true">
    <AlbumBackdrop v-if="mode === 'album'" :cover="cover" @cover-load="sampleCover" />
    <Transition v-else name="album-wash">
      <div :key="mode + ':' + cover" class="now-wash" :class="'background-' + mode">
        <PosterArtwork
          v-if="mode === 'refraction'"
          :cover="cover"
          :reduce-motion="reduceMotion"
          @cover-load="sampleCover"
        />
        <img v-else :src="cover" alt="" @load="sampleCover" />
      </div>
    </Transition>
  </div>
</template>
