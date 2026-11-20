<script setup>
defineProps({
  line: { type: Object, required: true },
  wordIndex: { type: Number, default: -1 },
  timed: Boolean,
})
</script>

<template>
  <span class="lyric-text">
    <template v-if="line.words">
      <span
        v-for="(word, index) in line.words"
        :key="index"
        :class="{
          'word-sung': timed && index < wordIndex,
          'word-pending': timed && index > wordIndex,
          'word-current': timed && index === wordIndex,
        }"
      >
        {{ word.text }}
      </span>
    </template>
    <template v-else>{{ line.text }}</template>
  </span>
</template>
