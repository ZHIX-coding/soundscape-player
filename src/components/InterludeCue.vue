<script setup>
import { Music2 } from 'lucide-vue-next'
defineProps({ visible: Boolean, announce: Boolean })
</script>

<template>
  <div v-if="announce" class="visually-hidden" role="status">{{ visible ? '间奏' : '' }}</div>
  <Transition name="interlude">
    <span v-if="visible" class="interlude-cue" aria-hidden="true">
      <Music2 />
      间奏
    </span>
  </Transition>
</template>
