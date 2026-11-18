<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { LocateFixed } from 'lucide-vue-next'
import { useAppearance } from '../stores/appearance'
import { usePlayer } from '../stores/music'
import { time } from '../persistence'
const p = usePlayer(),
  lines = ref(null)
const lyrics = computed(() => {
  const all = p.song?.lyrics ?? []
  const first = all.findIndex(
    (line) => !/^(作词|作曲|编曲|制作人|词|曲|Lyrics by|Composed by)\s*[:：]/i.test(line.text),
  )
  return first > 0 ? all.slice(first) : all
})
const active = ref(-1)
const wordIndex = ref(-1)
const speaking = ref(false)
let cueTimer
let paintFrame
let scrollFrame
function paintWord() {
  cancelAnimationFrame(paintFrame)
  const line = lyrics.value[active.value]
  const word = line?.words?.[wordIndex.value]
  const element = lines.value?.querySelector('.word-current')
  if (!element || !word) return
  const end = word.end ?? line.end
  if (!(end > word.start)) {
    element.style.setProperty('--ink', '100%')
    return
  }
  const fraction = Math.max(0, Math.min(1, (p.mediaTime() - word.start) / (end - word.start)))
  element.style.setProperty('--ink', (fraction * 100).toFixed(1) + '%')
  if (p.playing && fraction < 1 && !document.hidden && motionAllowed())
    paintFrame = requestAnimationFrame(paintWord)
}
// Media events resynchronise after a seek or track change. Between events,
// wake at the next recorded onset and read the audio clock again.
function syncLyrics() {
  clearTimeout(cueTimer)
  const t = p.mediaTime()
  const timedLines = lyrics.value
  active.value = timedLines.findLastIndex((line) => line.start <= t)
  const line = timedLines[active.value]
  const words = line?.words ?? []
  wordIndex.value = words.findLastIndex((word) => word.start <= t)
  speaking.value = wordIndex.value >= 0 && t < (line.end ?? Infinity)
  nextTick(() => {
    paintWord()
  })
  const next =
    words[wordIndex.value + 1]?.start ??
    (speaking.value ? line.end : undefined) ??
    timedLines[active.value + 1]?.start
  if (p.playing && next !== undefined) {
    cueTimer = setTimeout(syncLyrics, Math.max(16, Math.ceil((next - t) * 1000)))
  }
}
watch([() => p.position, () => p.playing, () => p.id], syncLyrics, { immediate: true })
onUnmounted(() => {
  clearTimeout(cueTimer)
  cancelAnimationFrame(paintFrame)
  cancelAnimationFrame(scrollFrame)
})
const appearance = useAppearance()
const browsing = ref(false)
const showList = computed(() => browsing.value || appearance.lyrics === 'static')
const single = computed(() => appearance.lyrics === 'single' && !browsing.value)
const previousLine = ref(-1)
let previousTimer
watch(active, (index, old) => {
  clearTimeout(previousTimer)
  previousLine.value = single.value && p.playing && index === old + 1 ? old : -1
  if (previousLine.value >= 0) previousTimer = setTimeout(() => (previousLine.value = -1), 420)
})
onUnmounted(() => clearTimeout(previousTimer))
const motionAllowed = () =>
  !appearance.reduceMotion && !matchMedia('(prefers-reduced-motion: reduce)').matches

function lineLength(text) {
  const width = [...text].reduce((sum, char) => sum + (/[^\u0000-\u00ff]/.test(char) ? 1 : 0.53), 0)
  return width > 37 ? 'long' : width > 24 ? 'medium' : 'short'
}

function browse() {
  if (browsing.value) return
  cancelAnimationFrame(scrollFrame)
  browsing.value = true
  nextTick(() => alignLine(false, true))
}
defineExpose({ toggleBrowse: () => (browsing.value ? resume() : browse()) })
function resume() {
  browsing.value = false
  nextTick(() => alignLine(true))
}
function jump(start) {
  p.seek(start)
  resume()
}
function keyboardBrowse(event) {
  if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) browse()
}
let touchStart
function touchBrowse(event) {
  const touch = event.touches[0]
  if (!touchStart || event.touches.length !== 1) return
  const dx = Math.abs(touch.clientX - touchStart.clientX)
  const dy = Math.abs(touch.clientY - touchStart.clientY)
  if (dy > 6 && dy > dx) browse()
}
function alignLine(smooth = false, afterSeek = false) {
  cancelAnimationFrame(scrollFrame)
  const box = lines.value
  if (!box || (browsing.value && !afterSeek)) return
  if (single.value) {
    box.scrollTop = 0
    return
  }
  const line = box.querySelector('.now') ?? box.firstElementChild
  if (!line) return
  if (appearance.lyrics === 'static' && !smooth && !afterSeek && !browsing.value) {
    const top = line.offsetTop - box.scrollTop
    if (top >= 36 && top + line.offsetHeight <= box.clientHeight - 36) return
  }
  const target = line.offsetTop - (box.clientHeight - line.offsetHeight) / 2
  const start = box.scrollTop
  if (!smooth || !motionAllowed() || Math.abs(target - start) < 2) {
    box.scrollTop = target
    return
  }
  const startedAt = performance.now()
  function move(now) {
    const t = Math.max(0, Math.min(1, (now - startedAt) / 240))
    box.scrollTop = start + (target - start) * (1 - (1 - t) ** 3)
    if (t < 1) scrollFrame = requestAnimationFrame(move)
  }
  scrollFrame = requestAnimationFrame(move)
}
watch(
  [active, () => p.seekVersion, () => appearance.lyrics, () => appearance.reduceMotion],
  async ([index, seekVersion, layout, reduced], previous) => {
    await nextTick()
    const natural =
      previous?.[1] === seekVersion && previous?.[2] === layout && previous?.[3] === reduced
    const afterSeek =
      previous?.[1] === undefined || previous[1] !== seekVersion || previous[2] !== layout
    alignLine(
      appearance.lyrics !== 'static' && !!natural && p.playing && index === previous[0] + 1,
      afterSeek,
    )
  },
  { immediate: true },
)
let resize
onMounted(() => {
  resize = new ResizeObserver(() => alignLine())
  if (lines.value) resize.observe(lines.value)
})
watch(lines, (box, previous) => {
  if (previous) resize?.unobserve(previous)
  if (box) resize?.observe(box)
})
onUnmounted(() => resize?.disconnect())
</script>
<template>
  <div
    class="lyrics-panel"
    :class="{ 'is-browsing': browsing, 'lyric-list': showList, 'single-line': single }"
  >
    <div
      ref="lines"
      class="lyrics"
      aria-label="同步歌词"
      role="region"
      tabindex="0"
      @wheel.passive="
        (e) => {
          if (!e.shiftKey && !e.ctrlKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) browse()
        }
      "
      @touchstart.passive="touchStart = $event.touches[0]"
      @touchmove.passive="touchBrowse"
      @keydown="keyboardBrowse"
    >
      <button
        v-for="(l, i) in lyrics"
        :key="p.id + i"
        :class="{
          now: i === active,
          'line-leaving': single && i === previousLine,
          'line-intro': single && active < 0 && i === 0,
        }"
        :data-offset="Math.max(-3, Math.min(3, i - Math.max(0, active)))"
        :data-distance="Math.min(3, Math.abs(i - Math.max(0, active)))"
        :data-length="lineLength(l.text)"
        :tabindex="
          (single ? i === Math.max(0, active) : showList || Math.abs(i - Math.max(0, active)) < 3)
            ? undefined
            : -1
        "
        :aria-current="i === active ? 'true' : undefined"
        :aria-label="l.text"
        @click="jump(l.start)"
      >
        <span v-if="browsing" class="lyric-time" aria-hidden="true">{{ time(l.start) }}</span>
        <span class="lyric-text">
          <template v-if="i === active && l.words">
            <span
              v-for="(word, index) in l.words"
              :key="index"
              :class="{
                'word-pending': index > wordIndex,
                'word-current': speaking && index === wordIndex,
              }"
            >
              {{ word.text }}
            </span>
          </template>
          <template v-else>{{ l.text }}</template>
        </span>
      </button>
    </div>
    <button v-if="browsing" class="resume-lyrics" @click="resume">
      <LocateFixed />
      回到当前句
    </button>
  </div>
</template>
