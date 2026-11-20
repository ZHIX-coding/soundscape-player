<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Volume2,
  ListMusic,
  ChevronUp,
  Repeat,
  Shuffle,
  Repeat1,
  X,
  ChevronDown,
} from 'lucide-vue-next'
import { playerFromQueue, queueFromPlayer, queueLocation } from '../browseOrigin'
import { usePlayer, useMusic } from '../stores/music'
import { songs } from '../data/songs'
import { time } from '../persistence'
import { vHorizontalSwipe } from '../horizontalSwipe'
import Modal from './Modal.vue'
defineProps({ compact: Boolean, nowPlaying: Boolean })
const route = useRoute()
const p = usePlayer(),
  m = useMusic(),
  panel = ref('')
const progress = computed(() =>
  p.duration > 0 ? Math.min(100, (p.position / p.duration) * 100) : 0,
)
const canSwipe = () => p.queue.length > 1
const queuedTracks = computed(() => {
  const byId = new Map(songs.map((song) => [song.id, song]))
  return p.queue.map((id) => byId.get(id)).filter(Boolean)
})
function changeTrack(offset) {
  if (canSwipe()) p.step(offset)
}
function cycle() {
  p.mode = p.modes[(p.modes.indexOf(p.mode) + 1) % p.modes.length]
  m.notify(p.mode)
}
</script>
<template>
  <footer
    v-if="p.song"
    class="dock"
    :class="{ 'queue-dock': compact, 'now-dock': nowPlaying }"
    aria-label="播放控制"
  >
    <div v-if="!compact" class="timeline">
      <small>{{ time(p.position) }}</small>
      <input
        type="range"
        min="0"
        :max="p.duration"
        step="0.1"
        :value="p.position"
        :style="{ '--progress': progress + '%' }"
        aria-label="播放进度"
        :aria-valuetext="time(p.position) + ' / ' + time(p.duration)"
        @input="p.seek($event.target.value)"
      />
      <small>{{ time(p.duration) }}</small>
    </div>
    <div class="dock-controls">
      <RouterLink
        v-if="!nowPlaying"
        v-horizontal-swipe="{ step: changeTrack, enabled: canSwipe }"
        class="track dock-track"
        :class="{ swipeable: canSwipe() }"
        :to="
          compact ? playerFromQueue(route.query) : { path: '/player', query: { from: route.path } }
        "
        aria-label="正在播放"
        :aria-description="canSwipe() ? '左右滑动、拖动或按方向键切换歌曲' : undefined"
        title="正在播放"
        @keydown.left.prevent="changeTrack(-1)"
        @keydown.right.prevent="changeTrack(1)"
      >
        <img :src="p.song.cover" alt="" />
        <span>
          <b>{{ p.song.title }}</b>
          <small>{{ p.song.artist }}</small>
        </span>
        <ChevronUp :size="14" />
      </RouterLink>
      <div class="transport">
        <button class="icon" aria-label="上一首" @click="p.step(-1)"><SkipBack /></button>
        <button class="play" :aria-label="p.playing ? '暂停' : '播放'" @click="p.toggle">
          <Pause v-if="p.playing" />
          <Play v-else />
        </button>
        <button class="icon" aria-label="下一首" @click="p.step(1)"><SkipForward /></button>
      </div>
      <div v-if="!compact" class="actions">
        <button class="icon wide-only" :aria-label="p.mode" :title="p.mode" @click="cycle">
          <Shuffle v-if="p.mode === '随机播放'" />
          <Repeat1 v-else-if="p.mode === '单曲循环'" />
          <Repeat v-else />
        </button>
        <button class="icon wide-only" aria-label="音量" @click="panel = '音量'">
          <Volume2 />
        </button>
        <RouterLink
          v-if="nowPlaying"
          class="icon"
          :to="queueFromPlayer(route.query)"
          aria-label="队列"
          title="队列"
        >
          <ListMusic />
        </RouterLink>
        <button v-else class="icon" aria-label="队列列表" title="队列" @click="panel = '列表'">
          <ListMusic />
        </button>
      </div>
    </div>
  </footer>
  <button
    v-if="compact && p.song"
    class="wall-round wall-queue-button"
    aria-label="列表"
    title="列表"
    @click="panel = '列表'"
  >
    <ListMusic />
  </button>
  <Modal v-if="panel" :title="panel" @close="panel = ''">
    <label>
      音量 {{ Math.round(p.volume * 100) }}%
      <input
        v-model.number="p.volume"
        type="range"
        min="0"
        max="1"
        step=".01"
        aria-label="调节音量"
      />
    </label>
    <template v-if="panel === '列表'">
      <button v-if="compact" class="pill" @click="panel = ''">拼贴</button>
      <RouterLink v-else class="pill" :to="queueLocation(route.path)" @click="panel = ''">
        拼贴
      </RouterLink>
      <button class="pill" @click="cycle">{{ p.mode }}</button>
      <label class="mobile-seek">
        进度 {{ time(p.position) }}
        <input
          type="range"
          :max="p.duration"
          :value="p.position"
          @input="p.seek($event.target.value)"
        />
      </label>
      <div
        v-for="(song, i) in queuedTracks"
        :key="song.id"
        class="queue-row"
        :class="{ current: p.id === song.id }"
      >
        <button class="menu-item track" @click="p.select(song.id)">
          <img :src="song.cover" alt="" />
          <span>
            <b>{{ song.title }}</b>
            <small>{{ p.id === song.id ? '当前曲目 · ' : '' }}{{ song.artist }}</small>
          </span>
        </button>
        <button
          class="icon"
          :aria-label="'上移 ' + song.title"
          :disabled="i === 0"
          @click="p.move(song.id, -1)"
        >
          <ChevronUp />
        </button>
        <button
          class="icon"
          :aria-label="'下移 ' + song.title"
          :disabled="i === queuedTracks.length - 1"
          @click="p.move(song.id, 1)"
        >
          <ChevronDown />
        </button>
        <button
          v-if="song.id !== p.id"
          class="icon"
          aria-label="移出队列"
          @click="p.remove(song.id)"
        >
          <X />
        </button>
      </div>
    </template>
  </Modal>
</template>
