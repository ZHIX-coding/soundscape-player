import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { isLyricCredit } from './data/lrc'
import { useAppearance } from './stores/appearance'
import { usePlayer } from './stores/music'

export function useLyricClock(surface) {
  const player = usePlayer()
  const appearance = useAppearance()
  const lyrics = computed(() => (player.song?.lyrics ?? []).filter((line) => !isLyricCredit(line)))
  const active = ref(-1)
  const wordIndex = ref(-1)
  const resting = computed(() => {
    const line = lyrics.value[active.value]
    const next = lyrics.value[active.value + 1]
    return !!(
      line &&
      next &&
      next.start - line.start > 10 &&
      player.position > Math.max(line.end ?? line.start, line.start + 5.8) &&
      next.start - player.position > 0.55
    )
  })
  let cueTimer
  let paintFrame
  let disposed = false
  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const motionAllowed = () => !appearance.reduceMotion && !systemMotion.matches

  function paintWord() {
    cancelAnimationFrame(paintFrame)
    if (disposed) return
    const line = lyrics.value[active.value]
    const word = line?.words?.[wordIndex.value]
    const element = surface.value?.querySelector('.word-current')
    if (!element || !word) return
    const end = word.end ?? line.end
    const duration = end - word.start
    const elapsed = player.mediaTime() - word.start
    const animate = motionAllowed()
    const fraction = duration > 0 && animate ? Math.min(1, Math.max(0, elapsed / duration)) : 1
    // Sustain the lift over long notes. Short syllables only get the color sweep.
    const weight = Math.min(1, Math.max(0, (duration - 0.24) / 0.92))
    const shape = Math.sin(Math.PI * fraction) ** 1.35
    const lift = animate && duration > 0 ? weight * shape : 0
    element.style.setProperty('--ink', (fraction * 100).toFixed(1) + '%')
    element.style.setProperty('--lift', lift.toFixed(3))
    if (player.playing && fraction < 1 && !document.hidden)
      paintFrame = requestAnimationFrame(paintWord)
  }

  function sync() {
    clearTimeout(cueTimer)
    const time = player.mediaTime()
    const timeline = lyrics.value
    active.value = timeline.findLastIndex((line) => line.start <= time)
    const words = timeline[active.value]?.words ?? []
    wordIndex.value = words.findLastIndex((word) => word.start <= time)
    nextTick(paintWord)
    const next = Math.min(
      words[wordIndex.value + 1]?.start ?? Infinity,
      timeline[active.value + 1]?.start ?? Infinity,
    )
    if (player.playing && Number.isFinite(next))
      cueTimer = setTimeout(sync, Math.max(16, Math.ceil((next - time) * 1000)))
  }

  watch(
    [
      () => player.position,
      () => player.playing,
      () => player.seekVersion,
      () => player.id,
      () => appearance.reduceMotion,
    ],
    sync,
    { immediate: true },
  )
  systemMotion.addEventListener('change', sync)
  document.addEventListener('visibilitychange', sync)
  onBeforeUnmount(() => {
    systemMotion.removeEventListener('change', sync)
    document.removeEventListener('visibilitychange', sync)
    disposed = true
    clearTimeout(cueTimer)
    cancelAnimationFrame(paintFrame)
  })
  return { lyrics, active, wordIndex, resting, paintWord, motionAllowed }
}
