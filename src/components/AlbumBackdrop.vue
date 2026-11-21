<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ cover: { type: String, required: true } })
const emit = defineEmits(['cover-load'])
const shown = ref('')

// Keep the previous frame until the new artwork is decoded, even during rapid skips.
watch(
  () => props.cover,
  async (url, previous, onCleanup) => {
    let current = true
    onCleanup(() => {
      current = false
    })
    const image = new Image()
    image.src = url
    try {
      await image.decode()
      if (current) shown.value = url
    } catch {
      if (current) shown.value = ''
    }
  },
  { immediate: true },
)
</script>

<template>
  <Transition name="album-crossfade">
    <div :key="shown" class="now-wash album-frame">
      <template v-if="shown">
        <div class="album-atmosphere"><img :src="shown" alt="" /></div>
        <div class="album-projection">
          <img :src="shown" alt="" @load="emit('cover-load', $event)" />
        </div>
      </template>
      <div class="album-bloom"></div>
    </div>
  </Transition>
</template>
