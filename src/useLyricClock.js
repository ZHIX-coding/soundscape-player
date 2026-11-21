import { inject, onBeforeUnmount, watch } from 'vue'
import { lyricTimelineKey, useLyricTimeline } from './useLyricTimeline'
import { useAppearance } from './stores/appearance'
import { usePlayer } from './stores/music'

export function useLyricClock(surface) {
  const player = usePlayer()
  const appearance = useAppearance()
  const timeline = inject(lyricTimelineKey, useLyricTimeline, true)
  const { lyrics, active, wordIndex, gap, upcoming, contextOnly } = timeline
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

  watch(
    [
      () => player.position,
      () => player.playing,
      () => player.seekVersion,
      () => player.id,
      () => appearance.reduceMotion,
      active,
      wordIndex,
      gap,
      upcoming,
      contextOnly,
    ],
    paintWord,
    { flush: 'post' },
  )
  systemMotion.addEventListener('change', paintWord)
  document.addEventListener('visibilitychange', paintWord)
  onBeforeUnmount(() => {
    systemMotion.removeEventListener('change', paintWord)
    document.removeEventListener('visibilitychange', paintWord)
    disposed = true
    cancelAnimationFrame(paintFrame)
  })
  return { ...timeline, paintWord, motionAllowed }
}
