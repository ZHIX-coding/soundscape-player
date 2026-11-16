import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { read, save } from '../persistence'

export const useAppearance = defineStore('appearance', () => {
  const stored = read('appearance', {})
  const size = ref(['标准', '放大'].includes(stored?.size) ? stored.size : '标准')
  const background = ref(['封面', '柔焦'].includes(stored?.background) ? stored.background : '封面')
  const reduceMotion = ref(stored?.reduceMotion === true)

  watch([size, background, reduceMotion], () => {
    save('appearance', {
      size: size.value,
      background: background.value,
      reduceMotion: reduceMotion.value,
    })
  })
  return { size, background, reduceMotion }
})
