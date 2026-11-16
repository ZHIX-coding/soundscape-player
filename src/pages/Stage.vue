<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import CoverBackdrop from '../components/CoverBackdrop.vue'
import CoverScene from '../components/CoverScene.vue'
import { BookOpen, Orbit, SlidersHorizontal, Maximize2, Minimize2 } from 'lucide-vue-next'
import LyricsPanel from '../components/LyricsPanel.vue'
import StageSettings from '../components/StageSettings.vue'
import { useAppearance } from '../stores/appearance'
import { usePlayer } from '../stores/music'
const p = usePlayer()
const appearance = useAppearance()
const settingsOpen = ref(false)
const immersive = ref(false)
const ink = ref('220, 216, 173')
let nativeScreen = false
async function switchScreen() {
  if (immersive.value) {
    immersive.value = false
    if (document.fullscreenElement) await document.exitFullscreen()
    return
  }
  immersive.value = true
  p.stageMode = '舞台'
  try {
    await document.documentElement.requestFullscreen()
  } catch {
    /* Mobile browsers can use the fixed stage. */
  }
}
function trackScreen() {
  if (nativeScreen && !document.fullscreenElement) immersive.value = false
  nativeScreen = !!document.fullscreenElement
}
function escapeScreen(event) {
  if (event.key === 'Escape' && !document.querySelector('dialog[open]')) immersive.value = false
}
onMounted(() => {
  document.addEventListener('fullscreenchange', trackScreen)
  window.addEventListener('keydown', escapeScreen)
})
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', trackScreen)
  window.removeEventListener('keydown', escapeScreen)
  if (nativeScreen && document.fullscreenElement) document.exitFullscreen().catch(() => {})
})
</script>
<template>
  <section
    class="stage"
    :style="{ '--scene-ink': ink }"
    :class="{
      theatre: p.stageMode === '舞台',
      immersive,
      'large-type': appearance.size === '放大',
      'soft-backdrop': appearance.background === '柔焦',
      'still-stage': appearance.reduceMotion,
      'is-playing': p.playing,
    }"
  >
    <CoverBackdrop :cover="p.song.cover" />
    <CoverScene v-if="p.stageMode === '舞台'" @palette="ink = $event" />
    <header class="row">
      <span class="eyebrow">{{ p.stageMode === '舞台' ? '现场舞台' : '歌词阅读' }}</span>
      <div class="stage-tools">
        <div class="toggle-group">
          <button
            v-for="mode in ['阅读', '舞台']"
            :key="mode"
            :class="{ active: p.stageMode === mode }"
            :aria-pressed="p.stageMode === mode"
            @click="p.stageMode = mode"
          >
            <BookOpen v-if="mode === '阅读'" />
            <Orbit v-else />
            {{ mode }}
          </button>
        </div>
        <button
          class="stage-settings"
          :aria-label="immersive ? '退出全屏' : '进入全屏'"
          :title="immersive ? '退出全屏' : '进入全屏'"
          @click="switchScreen"
        >
          <Minimize2 v-if="immersive" />
          <Maximize2 v-else />
        </button>
        <button
          class="stage-settings"
          aria-label="舞台外观"
          title="舞台外观"
          @click="settingsOpen = true"
        >
          <SlidersHorizontal />
        </button>
      </div>
    </header>
    <div class="stage-content">
      <div class="stage-cover">
        <img :src="p.song.cover" :alt="p.song.title + '封面'" />
        <span
          v-if="p.stageMode === '舞台' && p.song.title !== p.song.english"
          class="stage-subtitle"
        >
          {{ p.song.english }}
        </span>
        <h1>{{ p.song.title }}</h1>
        <p>{{ p.song.artist }} · {{ p.song.genre }}</p>
      </div>
      <LyricsPanel v-if="p.song.lyrics.length" :key="p.id" />
      <div
        v-else-if="p.song.plainLyrics"
        class="plain-lyrics"
        tabindex="0"
        role="region"
        aria-label="歌词原文"
      >
        {{ p.song.plainLyrics }}
      </div>
      <div v-else class="instrumental">
        <span class="eyebrow">{{ p.song.vocal ? 'NOW PLAYING' : 'INSTRUMENTAL' }}</span>
        <h2>{{ p.song.english }}</h2>
        <p>{{ p.song.vocal ? '此曲暂无同步歌词' : '纯音乐 · 无歌词' }}</p>
      </div>
    </div>
  </section>
  <StageSettings v-if="settingsOpen" @close="settingsOpen = false" />
</template>
