<script setup>
import { computed, ref } from 'vue'
import { Disc3, Music2, MicVocal, ListMusic } from 'lucide-vue-next'
import { usePlayer } from '../stores/music'
import { isLyricCredit } from '../data/lrc'
import { time } from '../persistence'
import { vHorizontalSwipe } from '../horizontalSwipe'
import LyricsPanel from './LyricsPanel.vue'

const player = usePlayer()
const panel = ref(null)
const song = computed(() => player.song)
const lines = computed(() => song.value.lyrics.filter((line) => !isLyricCredit(line)))
const firstVoice = computed(() => lines.value[0]?.start)
const gaps = computed(() => {
  const result = []
  for (let i = 0; i < lines.value.length - 1; i++) {
    const line = lines.value[i]
    const next = lines.value[i + 1].start
    // Enhanced LRC can mark the release exactly. Allow a longer hold for ordinary LRC.
    const release = line.end ?? Math.max(line.start + 6, (line.words?.at(-1)?.start ?? 0) + 2)
    if (next - release >= 8 && next - line.start > 10)
      result.push({ start: release + 0.8, end: next - 1, nextIndex: i + 1 })
  }
  return result
})
const gap = computed(() =>
  gaps.value.find((g) => player.position >= g.start && player.position < g.end),
)
const upcomingLine = computed(() => {
  if (player.position < firstVoice.value) return 0
  const beforeVoice = gaps.value.find(
    (g) => player.position >= g.end && player.position < lines.value[g.nextIndex].start,
  )
  return beforeVoice?.nextIndex ?? null
})
const phase = computed(() => {
  if (firstVoice.value == null) return song.value.plainLyrics ? 'text' : 'art'
  if (player.position < firstVoice.value - 1) return 'intro'
  return gap.value ? 'break' : 'voice'
})
const reading = computed(
  () => panel.value?.browsing || phase.value === 'voice' || phase.value === 'text',
)
const chapterOptions = computed(() => {
  if (firstVoice.value == null) return []
  const options = []
  if (firstVoice.value > 1) options.push({ id: 'intro', label: '前奏', at: 0, icon: Disc3 })
  options.push({ id: 'voice', label: '人声', at: firstVoice.value, icon: MicVocal })
  if (gaps.value.length)
    options.push({
      id: 'break',
      label: '间奏',
      at: (gap.value ?? gaps.value[0]).start,
      icon: Music2,
    })
  return options
})
function go(at) {
  if (panel.value?.browsing) panel.value.toggleBrowse()
  player.seek(at)
}
defineExpose({ toggleBrowse: () => panel.value?.toggleBrowse() })
</script>

<template>
  <div
    class="cinema"
    :class="{ 'cinema-reading': reading, 'cinema-spinning': player.playing }"
    :data-phase="phase"
  >
    <div
      v-horizontal-swipe="{ step: player.step, enabled: () => player.queue.length > 1 }"
      class="cinema-stage"
    >
      <div class="cinema-art" aria-hidden="true">
        <div class="cinema-disc">
          <div
            class="disc-label"
            :style="{ backgroundImage: 'url(' + JSON.stringify(song.cover) + ')' }"
          ></div>
        </div>
        <div class="cinema-sleeve"><img :src="song.cover" alt="" draggable="false" /></div>
      </div>
      <div class="cinema-titles" :class="{ 'long-title': song.title.length > 17 }">
        <span class="cinema-phase">
          <i></i>
          {{
            {
              intro: '前奏',
              voice: '人声',
              break: '间奏',
              art: song.vocal ? '暂无歌词' : '纯音乐',
              text: '歌词',
            }[phase]
          }}
        </span>
        <h1>{{ song.title }}</h1>
        <p>{{ song.artist }}</p>
      </div>
      <div v-if="lines.length || song.plainLyrics" class="cinema-words" :inert="!reading">
        <LyricsPanel v-if="lines.length" ref="panel" :upcoming-line="upcomingLine" />
        <div v-else class="plain-lyrics" tabindex="0" aria-label="歌词">{{ song.plainLyrics }}</div>
      </div>
    </div>
    <nav v-if="chapterOptions.length > 1" class="cinema-chapters" aria-label="段落跳转">
      <span class="chapter-label">
        <ListMusic :size="15" />
        段落跳转
      </span>
      <button
        v-for="item in chapterOptions"
        :key="item.id"
        :aria-current="phase === item.id ? 'true' : undefined"
        :aria-label="'跳到' + item.label"
        @click="go(item.at)"
      >
        <component :is="item.icon" :size="14" />
        {{ item.label }}
        <small>{{ time(item.at) }}</small>
      </button>
    </nav>
  </div>
</template>
