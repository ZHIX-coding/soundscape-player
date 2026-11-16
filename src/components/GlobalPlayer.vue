<script setup>
import { ref } from 'vue'
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
import { usePlayer, useMusic } from '../stores/music'
import { songs } from '../data/songs'
import { time } from '../persistence'
import Modal from './Modal.vue'
const p = usePlayer(),
  m = useMusic(),
  panel = ref('')
function cycle() {
  p.mode = p.modes[(p.modes.indexOf(p.mode) + 1) % p.modes.length]
  m.notify(p.mode)
}
</script>
<template>
  <footer class="dock">
    <RouterLink class="track dock-track" to="/player" aria-label="打开播放舞台">
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
    <div class="timeline">
      <small>{{ time(p.position) }}</small>
      <input
        type="range"
        min="0"
        :max="p.duration"
        step="0.1"
        :value="p.position"
        aria-label="播放进度"
        :aria-valuetext="time(p.position) + ' / ' + time(p.duration)"
        @input="p.seek($event.target.value)"
      />
      <small>{{ time(p.duration) }}</small>
    </div>
    <div class="actions">
      <button class="icon wide-only" :aria-label="p.mode" :title="p.mode" @click="cycle">
        <Shuffle v-if="p.mode === '随机播放'" />
        <Repeat1 v-else-if="p.mode === '单曲循环'" />
        <Repeat v-else />
      </button>
      <button class="icon wide-only" aria-label="音量" @click="panel = '音量'"><Volume2 /></button>
      <button class="icon" aria-label="打开播放队列" @click="panel = '播放队列'">
        <ListMusic />
      </button>
    </div>
  </footer>
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
    <template v-if="panel === '播放队列'">
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
        v-for="(song, i) in p.queue.map((id) => songs.find((s) => s.id === id))"
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
          :disabled="i === p.queue.length - 1"
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
