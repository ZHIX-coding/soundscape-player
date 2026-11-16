<script setup>
defineProps({ cover: { type: String, required: true } })
</script>
<template>
  <div class="cover-backdrop" aria-hidden="true">
    <Transition name="dissolve"><img :key="cover" :src="cover" alt="" /></Transition>
  </div>
</template>
