<script setup>
import CoverBackdrop from './CoverBackdrop.vue'

defineProps({
  cover: { type: String, default: '' },
  echoes: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="spatial-backdrop" aria-hidden="true">
    <CoverBackdrop v-if="cover" :cover="cover" />
    <div class="spatial-echoes">
      <img v-for="(url, i) in echoes" :key="i" :src="url" alt="" />
    </div>
  </div>
</template>
