<script setup>
import { computed, ref, watch } from 'vue'
import { usePlayer } from '../stores/music'
import { useLyricClock } from '../useLyricClock'
import LyricWords from './LyricWords.vue'

const surface = ref(null)
const player = usePlayer()
const { lyrics, active, wordIndex, resting } = useLyricClock(surface)
const current = computed(() => lyrics.value[active.value])
const natural = ref(false)
watch(
  [active, () => player.seekVersion, () => player.playing],
  ([index, seek, playing], [old, oldSeek]) => {
    natural.value = playing && old >= 0 && index === old + 1 && seek === oldSeek
  },
)
const duration = computed(() => {
  const following = lyrics.value[active.value + 1]
  return current.value && following && following.start - current.value.start < 2.4
    ? '200ms'
    : '320ms'
})
const visible = computed(() =>
  active.value < 0 ? [] : lyrics.value.slice(Math.max(0, active.value - 2), active.value + 2),
)
</script>

<template>
  <div
    ref="surface"
    class="wall-lyrics"
    :class="{ 'is-playing': natural, 'lyrics-resting': resting }"
    :style="{ '--wall-phrase-motion': duration }"
    aria-label="当前歌词"
  >
    <p
      v-for="line in visible"
      :key="line.start + ':' + line.text"
      class="wall-lyric"
      :class="{ 'wall-lyric-now': line === current }"
      :data-slot="lyrics.indexOf(line) - active"
      :data-long="[...line.text].length > 24 || undefined"
      :aria-hidden="resting || line !== current || undefined"
    >
      <LyricWords :line="line" :word-index="wordIndex" :timed="line === current" />
    </p>
  </div>
</template>
