<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { LocateFixed } from 'lucide-vue-next'
import { useAppearance } from '../stores/appearance'
import { usePlayer } from '../stores/music'
import { time } from '../persistence'
const p = usePlayer(),
  lines = ref(null)
const active = ref(-1)
const wordIndex = ref(-1)
const speaking = ref(false)
let cueTimer
let paintFrame
let entrance
let entranceLine
function syncEntrance() {
  const line = p.song.lyrics[active.value]
  const el = lines.value?.querySelector('.now .lyric-text')
  const elapsed = line ? Math.max(0, (p.mediaTime() - line.start) * 1000) : Infinity
  if (
    !el ||
    elapsed >= 850 ||
    browsing.value ||
    p.stageMode !== '舞台' ||
    appearance.reduceMotion ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    entrance?.cancel()
    entrance = null
    entranceLine = null
    return
  }
  if (el !== entranceLine) {
    entrance?.cancel()
    entranceLine = el
    const side = active.value % 2 ? -1 : 1
    entrance = el.animate(
      [
        {
          transform: `perspective(700px) translate3d(${side * 34}px,10px,-105px) rotateY(${side * 12}deg)`,
          opacity: 0.56,
        },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 850, easing: 'cubic-bezier(.18,.8,.22,1)', fill: 'both' },
    )
  }
  entrance.currentTime = elapsed
  if (p.playing) entrance.play()
  else entrance.pause()
}
function paintWord() {
  cancelAnimationFrame(paintFrame)
  const line = p.song.lyrics[active.value]
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
  if (p.playing && fraction < 1 && !document.hidden) paintFrame = requestAnimationFrame(paintWord)
}
// Media events resynchronise after a seek or track change. Between events,
// wake at the next recorded onset and read the audio clock again.
function syncLyrics() {
  clearTimeout(cueTimer)
  const t = p.mediaTime()
  const lyrics = p.song.lyrics
  active.value = lyrics.findLastIndex((line) => line.start <= t)
  const line = lyrics[active.value]
  const words = line?.words ?? []
  wordIndex.value = words.findLastIndex((word) => word.start <= t)
  speaking.value = wordIndex.value >= 0 && t < (line.end ?? Infinity)
  nextTick(() => {
    paintWord()
    syncEntrance()
  })
  const next =
    words[wordIndex.value + 1]?.start ??
    (speaking.value ? line.end : undefined) ??
    lyrics[active.value + 1]?.start
  if (p.playing && next !== undefined) {
    cueTimer = setTimeout(syncLyrics, Math.max(16, Math.ceil((next - t) * 1000)))
  }
}
watch([() => p.position, () => p.playing, () => p.id], syncLyrics, { immediate: true })
onUnmounted(() => {
  entrance?.cancel()
  clearTimeout(cueTimer)
  cancelAnimationFrame(paintFrame)
})
const lyricPhrases = computed(() =>
  p.song.lyrics.map((line) => {
    const words =
      line.words ??
      (line.text.match(/[^，。！？、；]+[，。！？、；]*/gu) ?? [line.text]).map((text) => ({
        text,
      }))
    const groups = [[]]
    words.forEach((word, index) => {
      groups.at(-1).push({ text: word.text, index })
      if (index + 1 < words.length && /[，。！？、；]$/u.test(word.text)) groups.push([])
    })
    return groups
  }),
)
const appearance = useAppearance()
const browsing = ref(false)
watch([browsing, () => appearance.reduceMotion, () => p.stageMode], () => nextTick(syncEntrance))
function browse() {
  if (browsing.value) return
  const box = lines.value
  box.scrollTo({ top: box.scrollTop, behavior: 'instant' })
  browsing.value = true
}
function resume() {
  browsing.value = false
  nextTick(() => alignLine(true))
}
function jump(start) {
  p.seek(start)
  resume()
}
function keyboardBrowse(event) {
  if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', 'Tab'].includes(event.key))
    browse()
}
let touchY = 0
function alignLine(smooth = false) {
  const box = lines.value
  if (!box || browsing.value) return
  const line = box.querySelector('.now') ?? box.firstElementChild
  if (!line) return
  const motion = !appearance.reduceMotion && !matchMedia('(prefers-reduced-motion: reduce)').matches
  box.scrollTo({
    top: line.offsetTop - (box.clientHeight - line.offsetHeight) / 2,
    behavior: smooth && motion ? 'smooth' : 'instant',
  })
}
watch(
  [active, () => p.id, () => p.stageMode, () => appearance.size, () => appearance.reduceMotion],
  async ([index, id], previous) => {
    await nextTick()
    alignLine(previous?.[1] === id && index !== previous[0])
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
  <div class="lyrics-panel" :class="{ 'is-browsing': browsing }">
    <div
      ref="lines"
      class="lyrics"
      aria-label="同步歌词"
      role="region"
      tabindex="0"
      @wheel.passive="
        (e) => {
          if (e.deltaY) browse()
        }
      "
      @touchstart.passive="touchY = $event.touches[0].clientY"
      @touchmove.passive="
        (e) => {
          if (Math.abs(e.touches[0].clientY - touchY) > 6) browse()
        }
      "
      @keydown="keyboardBrowse"
    >
      <button
        v-for="(l, i) in p.song.lyrics"
        :key="p.id + i"
        :class="{ now: i === active }"
        :data-distance="Math.min(3, Math.abs(i - Math.max(0, active)))"
        :data-side="i < active ? 'past' : 'next'"
        :aria-current="i === active ? 'true' : undefined"
        :aria-label="l.text"
        @click="jump(l.start)"
      >
        <span v-if="browsing" class="lyric-time" aria-hidden="true">{{ time(l.start) }}</span>
        <span class="lyric-text">
          <span v-for="(phrase, part) in lyricPhrases[i]" :key="part" class="lyric-phrase">
            <span
              v-for="word in phrase"
              :key="word.index"
              :class="{
                'word-pending': i === active && l.words && word.index > wordIndex,
                'word-current': i === active && speaking && word.index === wordIndex,
              }"
            >
              {{ word.text }}
            </span>
          </span>
        </span>
      </button>
    </div>
    <button v-if="browsing" class="resume-lyrics" @click="resume">
      <LocateFixed />
      回到当前句
    </button>
  </div>
</template>
