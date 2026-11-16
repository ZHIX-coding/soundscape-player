<script setup>
import { computed } from 'vue'
const props = defineProps({ tracks: { type: Array, required: true } })
const covers = computed(() =>
  [...new Set(props.tracks.map((s) => s.cover).filter(Boolean))].slice(0, 4),
)
</script>
<template>
  <span class="playlist-art" :class="'tiles-' + covers.length" aria-hidden="true">
    <img v-for="cover in covers" :key="cover" :src="cover" alt="" />
    <span v-if="!covers.length" class="blank-record"></span>
  </span>
</template>
