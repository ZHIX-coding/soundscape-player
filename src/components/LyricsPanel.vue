<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { LocateFixed } from 'lucide-vue-next'
import { useAppearance } from '../stores/appearance'
import { usePlayer } from '../stores/music'
import { time } from '../persistence'
import InterludeCue from './InterludeCue.vue'
import LyricWords from './LyricWords.vue'
import OrbitLyrics from './OrbitLyrics.vue'
import { useLyricClock } from '../useLyricClock'

const p = usePlayer()
const appearance = useAppearance()
const lines = ref(null)
const { lyrics, active, wordIndex, gap, upcoming, contextOnly, paintWord, motionAllowed } =
  useLyricClock(lines)
const cinema = computed(() => appearance.lyrics === 'cinema')
const lengths = computed(() =>
  lyrics.value.map((line) => {
    const width = [...line.text].reduce(
      (sum, char) => sum + (/[^\u0000-\u00ff]/.test(char) ? 1 : 0.53),
      0,
    )
    return width > 48 ? 'extended' : width > 32 ? 'long' : width > 20 ? 'medium' : 'short'
  }),
)
const browsing = ref(false)
const staticView = computed(() => appearance.lyrics === 'static' && !browsing.value)
const showList = computed(() => browsing.value || staticView.value)
const resting = computed(() => !!gap.value && !cinema.value && !showList.value)
const preview = computed(() =>
  showList.value || (active.value < 0 && !cinema.value) ? null : upcoming.value,
)
const focusIndex = computed(() => preview.value ?? active.value)
const singing = computed(() =>
  gap.value || upcoming.value !== null || contextOnly.value ? -1 : active.value,
)
const orbit = computed(() => appearance.lyrics === 'poster' && !browsing.value)
const single = computed(() => appearance.lyrics === 'single' && !browsing.value)
const leaving = ref(-1)
const entering = ref(-1)
const phraseArrival = ref(-1)
let scrollFrame
let scrollTarget = 0
let scrollPosition = 0
let scrollVelocity = 0
let scrollTimestamp = 0
let scrollFrequency = 16
const lineMotion = ref(280)
let transitionTimer

function clearTransition() {
  clearTimeout(transitionTimer)
  leaving.value = -1
  entering.value = -1
}
function stopScroll() {
  cancelAnimationFrame(scrollFrame)
  scrollFrame = undefined
  scrollVelocity = 0
}

function glide(now) {
  const box = lines.value
  if (!box || !p.playing || !motionAllowed()) {
    if (box) box.scrollTop = scrollTarget
    stopScroll()
    return
  }
  const dt = Math.min(0.035, Math.max(0, (now - scrollTimestamp) / 1000))
  scrollTimestamp = now
  // Critically damped motion, with position and velocity carried into a new target.
  const offset = scrollPosition - scrollTarget
  const impulse = scrollVelocity + scrollFrequency * offset
  const decay = Math.exp(-scrollFrequency * dt)
  scrollPosition = scrollTarget + (offset + impulse * dt) * decay
  scrollVelocity = (scrollVelocity - scrollFrequency * impulse * dt) * decay
  box.scrollTop = scrollPosition
  if (Math.abs(scrollPosition - scrollTarget) < 0.65 && Math.abs(scrollVelocity) < 11) {
    box.scrollTop = scrollTarget
    stopScroll()
    return
  }
  scrollFrame = requestAnimationFrame(glide)
}

function openBrowse() {
  if (browsing.value || !lyrics.value.length) return
  stopScroll()
  clearTransition()
  browsing.value = true
  const index = gap.value?.nextIndex ?? upcoming.value ?? Math.max(0, active.value)
  nextTick(() => alignLine(false, true, index))
}
function resume() {
  browsing.value = false
  nextTick(() => alignLine(true, true))
}
defineExpose({
  browsing,
  openBrowse,
  toggleBrowse: () => (browsing.value ? resume() : openBrowse()),
})
function jump(start) {
  p.seek(start)
  resume()
}
function keyboardBrowse(event) {
  if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key))
    openBrowse()
}
function alignLine(smooth = false, recenter = false, index) {
  const box = lines.value
  if (!box || orbit.value || (browsing.value && !recenter)) return
  if (single.value) {
    stopScroll()
    box.scrollTop = 0
    return
  }
  const line =
    (index === undefined
      ? box.querySelector('.lyric-preview, .now, .lyric-context')
      : box.children[index]) ?? box.firstElementChild
  if (!line) return

  const start = box.scrollTop
  const height = box.clientHeight
  const center = line.offsetTop + line.offsetHeight / 2
  const anchor = Number(getComputedStyle(box).getPropertyValue('--lyric-anchor')) / 100
  if (staticView.value && !recenter) {
    const top = line.offsetTop - start
    if (top >= 28 && top + line.offsetHeight <= height - 34) return
  }
  const target = Math.min(box.scrollHeight - height, Math.max(0, center - height * anchor))
  if (!smooth || !motionAllowed() || Math.abs(target - start) < 2) {
    stopScroll()
    box.scrollTop = target
    return
  }

  scrollTarget = target
  scrollFrequency = appearance.lyrics === 'depth' ? 15 : 18
  const next = lyrics.value[active.value + 1]
  const current = lyrics.value[active.value]
  if (next && current && next.start - current.start < 2.15) scrollFrequency += 6
  if (scrollFrame !== undefined) return
  scrollPosition = start
  scrollTimestamp = performance.now()
  scrollFrame = requestAnimationFrame(glide)
}
watch(
  [focusIndex, () => p.seekVersion, () => appearance.lyrics, () => appearance.reduceMotion],
  ([index, seek, mode, reduced], previous) => {
    const recenter = previous?.[1] !== seek || previous?.[2] !== mode || previous?.[3] !== reduced
    const natural = !recenter && preview.value === null && index === previous[0] + 1 && p.playing
    clearTransition()
    phraseArrival.value = natural && motionAllowed() ? index : -1
    if (single.value && natural && motionAllowed()) {
      const now = lyrics.value[index]
      const next = lyrics.value[index + 1]
      lineMotion.value = next && next.start - now.start < 2.3 ? 190 : 295
      leaving.value = previous[0]
      entering.value = index
      transitionTimer = setTimeout(clearTransition, lineMotion.value)
    }
    nextTick(() => {
      alignLine(natural && !staticView.value, recenter && !browsing.value)
      paintWord()
    })
  },
  { immediate: true },
)
let resize
onMounted(() => {
  resize = new ResizeObserver(() => alignLine())
  if (lines.value) resize.observe(lines.value)
})
watch(lines, (box, old) => {
  if (old) resize?.unobserve(old)
  if (box) resize?.observe(box)
  nextTick(paintWord)
})
onUnmounted(() => {
  clearTransition()
  stopScroll()
  resize?.disconnect()
})
</script>

<template>
  <div
    class="lyrics-panel"
    :style="{ '--line-motion': lineMotion + 'ms' }"
    :class="{
      'is-browsing': browsing,
      'lyric-list': showList,
      'single-line': single,
      'lyrics-resting': resting && !orbit,
      'interlude-reading': showList,
    }"
  >
    <OrbitLyrics
      v-if="orbit"
      :lyrics="lyrics"
      :active="focusIndex"
      :singing="singing"
      :preview="preview"
      :word-index="wordIndex"
      :seek-version="p.seekVersion"
      :playing="p.playing"
      :resting="resting"
      :reduce-motion="appearance.reduceMotion"
      @surface="lines = $event"
      @browse="openBrowse"
      @jump="jump"
    />
    <div
      v-else
      ref="lines"
      class="lyrics"
      aria-label="同步歌词"
      role="region"
      tabindex="0"
      @keydown="keyboardBrowse"
    >
      <button
        v-for="(line, i) in lyrics"
        :key="i"
        type="button"
        :class="{
          now: i === singing,
          'lyric-preview': i === preview,
          'lyric-context': i === focusIndex && i !== singing && i !== preview,
          'phrase-arrival': i === phraseArrival && !line.words,
          'line-leaving': i === leaving,
          'line-entering': i === entering,
          'line-intro': single && active < 0 && preview === null && i === 0,
        }"
        :data-offset="Math.max(-3, Math.min(3, i - Math.max(0, focusIndex)))"
        :data-distance="Math.min(3, Math.abs(i - Math.max(0, focusIndex)))"
        :data-length="lengths[i]"
        :tabindex="
          showList ||
          (!resting &&
            (single ? i === Math.max(0, focusIndex) : Math.abs(i - Math.max(0, focusIndex)) < 3))
            ? undefined
            : -1
        "
        :aria-hidden="(resting && !showList) || undefined"
        :aria-current="i === singing ? 'true' : undefined"
        :aria-label="line.text"
        @click="jump(line.start)"
      >
        <span v-if="browsing" class="lyric-time" aria-hidden="true">{{ time(line.start) }}</span>
        <LyricWords :line="line" :word-index="wordIndex" :timed="i === singing" />
      </button>
    </div>
    <InterludeCue v-if="!cinema" :visible="!!gap" announce />
    <button v-if="browsing" class="resume-lyrics" @click="resume">
      <LocateFixed />
      {{ gap || active < 0 ? '回到播放' : '回到当前句' }}
    </button>
  </div>
</template>
