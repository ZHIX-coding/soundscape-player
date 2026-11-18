import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { read, save } from '../persistence'

export const lyricLayouts = [
  { id: 'split', label: '双栏' },
  { id: 'single', label: '单句' },
  { id: 'poster', label: '海报' },
  { id: 'depth', label: '景深' },
  { id: 'static', label: '静态' },
]

export const useAppearance = defineStore('appearance', () => {
  const stored = read('appearance', {})
  const savedLayout = stored?.lyrics === 'list' ? 'static' : stored?.lyrics
  const lyrics = ref(lyricLayouts.some(({ id }) => id === savedLayout) ? savedLayout : 'split')
  const background = ref(['cover', '封面'].includes(stored?.background) ? 'cover' : 'color')
  const reduceMotion = ref(stored?.reduceMotion === true)

  watch([lyrics, background, reduceMotion], () => {
    save('appearance', {
      lyrics: lyrics.value,
      background: background.value,
      reduceMotion: reduceMotion.value,
    })
  })
  return { lyrics, background, reduceMotion }
})
