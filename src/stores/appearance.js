import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { read, save } from '../persistence'

export const useAppearance = defineStore('appearance', () => {
  const stored = read('appearance', {})
  const lyrics = ref(stored?.lyrics ?? (read('stage', '') === '阅读' ? 'list' : 'focus'))
  const background = ref(['cover', '封面'].includes(stored?.background) ? 'cover' : 'color')
  const reduceMotion = ref(stored?.reduceMotion === true)
  if (lyrics.value !== 'list') lyrics.value = 'focus'

  watch([lyrics, background, reduceMotion], () => {
    save('appearance', {
      lyrics: lyrics.value,
      background: background.value,
      reduceMotion: reduceMotion.value,
    })
  })
  return { lyrics, background, reduceMotion }
})
