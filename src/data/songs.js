import { shallowReactive } from 'vue'

export const songs = shallowReactive([])

export async function loadBrowserTestSongs() {
  if (import.meta.env.MODE === 'browser-test') {
    const { demoSongs } = await import('./demoSongs')
    songs.push(...demoSongs)
  }
}
