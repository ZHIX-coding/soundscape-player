<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  Music2,
  Captions,
} from 'lucide-vue-next'
import PlaybackBackdrop from '../components/PlaybackBackdrop.vue'
import LyricsPanel from '../components/LyricsPanel.vue'
import StageSettings from '../components/StageSettings.vue'
import { vHorizontalSwipe } from '../horizontalSwipe'
import { useAppearance } from '../stores/appearance'
import { browseOrigin, queueFromPlayer } from '../browseOrigin'
import { usePlayer } from '../stores/music'

const p = usePlayer()
const route = useRoute()
const router = useRouter()
const backTo = computed(() =>
  route.query.from === '/queue' ? queueFromPlayer(route.query) : browseOrigin(route.query.from),
)
const appearance = useAppearance()
const settingsOpen = ref(false)
const lyricPanel = ref(null)
const immersive = ref(false)
const quiet = ref(false)
const canSwipe = () => p.queue.length > 1
let hideTimer
let nativeScreen = false
const wakeEvents = ['pointermove', 'pointerdown', 'keydown', 'focusin', 'focusout', 'close']

function wakeControls() {
  clearTimeout(hideTimer)
  quiet.value = false
  if (
    !immersive.value ||
    !p.playing ||
    settingsOpen.value ||
    !matchMedia('(hover: hover) and (pointer: fine)').matches
  )
    return
  hideTimer = setTimeout(() => {
    quiet.value = !document.querySelector(
      'dialog[open], .now-header :focus-visible, .now-dock :focus-visible',
    )
  }, 2500)
}
watch([immersive, () => p.playing, settingsOpen], wakeControls)

async function exitScreen() {
  immersive.value = false
  if (document.fullscreenElement) await document.exitFullscreen()
}
async function switchScreen() {
  if (immersive.value) return exitScreen()
  immersive.value = true
  try {
    await document.documentElement.requestFullscreen()
  } catch {
    // The viewport-filling layout still works on browsers without native fullscreen.
  }
}
function trackScreen() {
  if (nativeScreen && !document.fullscreenElement) immersive.value = false
  nativeScreen = !!document.fullscreenElement
}
function escapeScreen(event) {
  if (event.key === 'Escape' && immersive.value && !document.querySelector('dialog[open]'))
    exitScreen()
}
onMounted(() => {
  if (p.song && route.query.show === 'concert') {
    switchScreen()
    router.replace({ query: { ...route.query, show: undefined } })
  }
  document.addEventListener('fullscreenchange', trackScreen)
  window.addEventListener('keydown', escapeScreen)
  for (const event of wakeEvents) document.addEventListener(event, wakeControls, true)
})
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', trackScreen)
  window.removeEventListener('keydown', escapeScreen)
  for (const event of wakeEvents) document.removeEventListener(event, wakeControls, true)
  clearTimeout(hideTimer)
  if (nativeScreen && document.fullscreenElement) document.exitFullscreen().catch(() => {})
})
</script>

<template>
  <section
    v-if="p.song"
    class="now-playing"
    aria-label="正在播放"
    :class="{
      'controls-quiet': quiet && immersive,
      ['layout-' + appearance.lyrics]: true,
      'artwork-background': appearance.background !== 'color',
      'photo-background': appearance.background === 'cover',
      'reduce-motion': appearance.reduceMotion,
      'has-lyrics': p.song.lyrics.length || p.song.plainLyrics,
    }"
  >
    <PlaybackBackdrop
      :cover="p.song.cover"
      :mode="appearance.background"
      :reduce-motion="appearance.reduceMotion"
    />
    <header class="now-header">
      <RouterLink class="now-tool" :to="backTo" aria-label="返回" title="返回">
        <ChevronLeft />
      </RouterLink>
      <div class="now-tools">
        <button
          v-if="p.song.lyrics.length"
          class="now-tool"
          title="歌词"
          @click="lyricPanel?.toggleBrowse()"
        >
          <Captions />
          <span>歌词</span>
        </button>
        <button class="now-tool" title="显示" @click="settingsOpen = true">
          <SlidersHorizontal />
          <span>显示</span>
        </button>
        <button class="now-tool" :title="immersive ? '退出全屏' : '全屏'" @click="switchScreen">
          <Minimize2 v-if="immersive" />
          <Maximize2 v-else />
          <span>{{ immersive ? '退出全屏' : '全屏' }}</span>
        </button>
      </div>
    </header>
    <div
      v-horizontal-swipe="{ step: p.step, enabled: canSwipe }"
      class="now-content"
      :class="{ swipeable: canSwipe() }"
    >
      <div class="now-album">
        <img :src="p.song.cover" alt="" />
        <div class="now-meta">
          <h1>{{ p.song.title }}</h1>
          <p>{{ p.song.artist }}</p>
        </div>
      </div>
      <LyricsPanel v-if="p.song.lyrics.length" :key="p.id" ref="lyricPanel" />
      <div
        v-else-if="p.song.plainLyrics"
        class="plain-lyrics"
        tabindex="0"
        role="region"
        aria-label="歌词"
      >
        {{ p.song.plainLyrics }}
      </div>
      <p v-else class="no-lyrics">{{ p.song.vocal ? '暂无歌词' : '纯音乐' }}</p>
    </div>
  </section>
  <section v-else class="library-empty">
    <Music2 aria-hidden="true" />
    <h1>暂无播放</h1>
    <RouterLink class="solid" to="/library">发现</RouterLink>
  </section>
  <StageSettings v-if="settingsOpen" @close="settingsOpen = false" />
</template>
