<script setup>
import { computed, ref, watch } from 'vue'
import { usePlayer } from '../stores/music'
import { useLyricClock } from '../useLyricClock'
import InterludeCue from './InterludeCue.vue'
import LyricWords from './LyricWords.vue'

const surface = ref(null)
const player = usePlayer()
const { lyrics, active, wordIndex, gap, upcoming, contextOnly } = useLyricClock(surface)
const focus = computed(() => upcoming.value ?? active.value)
const current = computed(() => lyrics.value[focus.value])
const singing = computed(() => !gap.value && upcoming.value === null && !contextOnly.value)
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
  active.value < 0 ? [] : lyrics.value.slice(Math.max(0, focus.value - 2), focus.value + 2),
)
</script>

<template>
  <div
    ref="surface"
    class="wall-lyrics"
    :class="{ 'is-playing': natural, 'lyrics-resting': !!gap }"
    :style="{ '--wall-phrase-motion': duration }"
    aria-label="当前歌词"
  >
    <InterludeCue :visible="!!gap" announce />
    <p
      v-for="line in visible"
      :key="line.start + ':' + line.text"
      class="wall-lyric"
      :class="{
        'wall-lyric-now': line === current && singing,
        'lyric-context': line === current && !singing,
      }"
      :data-slot="lyrics.indexOf(line) - focus"
      :data-long="[...line.text].length > 24 || undefined"
      :aria-hidden="gap || line !== current || undefined"
    >
      <LyricWords :line="line" :word-index="wordIndex" :timed="line === current && singing" />
    </p>
  </div>
</template>
