import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { read, save } from '../persistence'

export const lyricLayouts = [
  { id: 'split', label: '双栏' },
  { id: 'single', label: '单句' },
  { id: 'poster', label: '环绕' },
  { id: 'depth', label: '景深' },
  { id: 'static', label: '静态' },
]

export const backgroundStyles = [
  { id: 'color', label: '取色' },
  { id: 'cover', label: '封面' },
  { id: 'refraction', label: '折射' },
]

export const useAppearance = defineStore('appearance', () => {
  const stored = read('appearance', {})
  const savedLayout = stored?.lyrics === 'list' ? 'static' : stored?.lyrics
  const lyrics = ref(lyricLayouts.some(({ id }) => id === savedLayout) ? savedLayout : 'split')
  const savedBackground = stored?.background === '封面' ? 'cover' : stored?.background
  const background = ref(
    stored?.version !== 2 && savedLayout === 'poster'
      ? 'refraction'
      : backgroundStyles.some(({ id }) => id === savedBackground)
        ? savedBackground
        : 'color',
  )
  const reduceMotion = ref(stored?.reduceMotion === true)

  watch(
    [lyrics, background, reduceMotion],
    () => {
      save('appearance', {
        version: 2,
        lyrics: lyrics.value,
        background: background.value,
        reduceMotion: reduceMotion.value,
      })
    },
    { immediate: true },
  )
  return { lyrics, background, reduceMotion }
})
