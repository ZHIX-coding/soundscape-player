import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { isLyricCredit } from './data/lrc'
import { usePlayer } from './stores/music'

export const lyricTimelineKey = Symbol('lyric timeline')

// Media time can be rounded to microseconds after a seek.
const clockTolerance = 0.001
const leadIn = 1

export function useLyricTimeline() {
  const player = usePlayer()
  const lyrics = computed(() => (player.song?.lyrics ?? []).filter((line) => !isLyricCredit(line)))
  const firstVoice = computed(() => lyrics.value[0]?.start)
  const releaseTimes = computed(() =>
    lyrics.value.map((line) => line.end ?? line.words?.at(-1)?.end),
  )
  const gaps = computed(() => {
    const windows = []
    for (let i = 0; i < lyrics.value.length - 1; i++) {
      const line = lyrics.value[i]
      const next = lyrics.value[i + 1].start
      const release =
        releaseTimes.value[i] ?? Math.max(line.start + 6, (line.words?.at(-1)?.start ?? 0) + 2)
      if (next - release >= 8 && next - line.start > 10)
        windows.push({ start: release + 0.8, end: next - leadIn, nextIndex: i + 1 })
    }
    return windows
  })

  const active = ref(-1)
  const wordIndex = ref(-1)
  const gap = ref(null)
  const upcoming = ref(null)
  const contextOnly = ref(false)
  let cueTimer
  function sync() {
    clearTimeout(cueTimer)
    const time = player.mediaTime() + clockTolerance
    const timeline = lyrics.value
    const index = timeline.findLastIndex((line) => line.start <= time)
    const release = releaseTimes.value[index]
    const words = timeline[index]?.words ?? []
    const nextLine = timeline[index + 1]?.start ?? Infinity
    const nextGap = gaps.value.find((window) => window.nextIndex === index + 1)
    const previewAt = index === -1 ? Math.max(0, nextLine - leadIn) : nextGap?.end
    active.value = index
    wordIndex.value = words.findLastIndex((word) => word.start <= time)
    gap.value = nextGap && time >= nextGap.start && time < nextGap.end ? nextGap : null
    upcoming.value =
      previewAt !== undefined && time >= previewAt && time < nextLine ? index + 1 : null
    contextOnly.value = release !== undefined && time >= release

    const next = Math.min(
      ...[words[wordIndex.value + 1]?.start, nextLine, nextGap?.start, previewAt, release].filter(
        (boundary) => boundary > time,
      ),
    )
    if (player.playing && Number.isFinite(next))
      cueTimer = setTimeout(sync, Math.max(8, Math.ceil((next - time) * 1000)))
  }
  watch(
    [() => player.position, () => player.playing, () => player.seekVersion, () => player.id],
    sync,
    { immediate: true },
  )
  document.addEventListener('visibilitychange', sync)
  onBeforeUnmount(() => {
    clearTimeout(cueTimer)
    document.removeEventListener('visibilitychange', sync)
  })
  return { lyrics, firstVoice, gaps, active, wordIndex, gap, upcoming, contextOnly }
}
