<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  GalleryHorizontalEnd,
  Orbit,
  PanelsTopLeft,
  AudioLines,
} from 'lucide-vue-next'
import CoverBackdrop from './CoverBackdrop.vue'
import { usePlayer } from '../stores/music'
import { read, save, time } from '../persistence'

const props = defineProps({ items: { type: Array, required: true } })
const modes = [
  { id: 'corridor', label: '镜廊', icon: GalleryHorizontalEnd },
  { id: 'orbit', label: '环轨', icon: Orbit },
  { id: 'wall', label: '唱片墙', icon: PanelsTopLeft },
]
const saved = read('exhibition', 'corridor')
const mode = ref(modes.some((m) => m.id === saved) ? saved : 'corridor')
watch(mode, (value) => save('exhibition', value))
const p = usePlayer()
const router = useRouter()
const selectedId = ref(props.items[0]?.id)
const index = computed(() =>
  Math.max(
    0,
    props.items.findIndex((s) => s.id === selectedId.value),
  ),
)
const selected = computed(() => props.items[index.value])
watch(selected, (song) => {
  if (song) selectedId.value = song.id
})
const wrap = (i) => (i + props.items.length) % props.items.length
const cards = computed(() => {
  const count = props.items.length
  if (mode.value === 'wall') {
    const start = Math.floor(index.value / 5) * 5
    const tiles = props.items.slice(start, start + 5).map((song, i) => ({
      song,
      offset: start + i - index.value,
      style: {},
    }))
    return [tiles[index.value - start], ...tiles.filter((tile) => tile.offset)]
  }
  const visible = Math.min(count, mode.value === 'orbit' ? 7 : 5)
  return Array.from({ length: visible }, (_, i) => {
    const offset = i - Math.floor((visible - 1) / 2)
    const angle = (offset * Math.PI * 2) / Math.max(visible, 3)
    const depth = (1 + Math.cos(angle)) / 2
    return {
      song: props.items[wrap(index.value + offset)],
      offset,
      style: {
        '--arc-x': Math.sin(angle).toFixed(4),
        '--arc-depth': depth.toFixed(4),
        '--arc-tilt': Math.sin(angle) * -39 + 'deg',
        '--arc-scale': 0.45 + 0.59 * depth,
        '--layer': Math.round(depth * 10) + 1,
      },
    }
  })
})
function shift(n) {
  selectedId.value = props.items[wrap(index.value + n)].id
}
function play() {
  if (p.id === selected.value.id) p.toggle()
  else
    p.select(
      selected.value.id,
      props.items.map((s) => s.id),
    )
}
function openStage() {
  p.stageMode = '舞台'
  p.select(
    selected.value.id,
    props.items.map((s) => s.id),
  )
  router.push('/player')
}
let startX = 0,
  startY = 0,
  swipedAt = -Infinity
function touchStart(e) {
  startX = e.touches[0].clientX
  startY = e.touches[0].clientY
}
function touchEnd(e) {
  const dx = e.changedTouches[0].clientX - startX
  if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(e.changedTouches[0].clientY - startY)) {
    shift(dx < 0 ? 1 : -1)
    swipedAt = performance.now()
  }
}
function moveView(event) {
  if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches)
    return
  const surface = event.currentTarget
  const box = surface.getBoundingClientRect()
  surface.style.setProperty('--look-x', ((event.clientX - box.left) / box.width - 0.5) * 6 + 'deg')
  surface.style.setProperty('--look-y', (0.5 - (event.clientY - box.top) / box.height) * 4 + 'deg')
}
function resetView(event) {
  event.currentTarget.style.removeProperty('--look-x')
  event.currentTarget.style.removeProperty('--look-y')
}
function pick(card) {
  if (performance.now() - swipedAt < 350) return
  if (card.offset) selectedId.value = card.song.id
  else play()
}
</script>
<template>
  <section
    v-if="selected"
    class="gallery exhibition"
    :class="'scene-' + mode"
    aria-label="空间封面展厅"
    tabindex="0"
    @keydown.left.prevent="shift(-1)"
    @keydown.right.prevent="shift(1)"
  >
    <CoverBackdrop :cover="selected.cover" />
    <header class="exhibit-header">
      <h1>封面展厅</h1>
      <div class="exhibit-modes" role="group" aria-label="展厅布局">
        <button v-for="m in modes" :key="m.id" :aria-pressed="mode === m.id" @click="mode = m.id">
          <component :is="m.icon" />
          {{ m.label }}
        </button>
      </div>
    </header>
    <div
      class="exhibit-space"
      @pointermove="moveView"
      @pointerleave="resetView"
      @touchstart.passive="touchStart"
      @touchend.passive="touchEnd"
    >
      <div class="orbit-path" aria-hidden="true"></div>
      <div class="exhibit-rack">
        <button
          v-for="card in cards"
          :key="card.song.id"
          class="sleeve"
          :class="['pos' + card.offset, { 'on-display': !card.offset }]"
          :style="card.style"
          :aria-label="(card.offset ? '浏览 ' : '播放或暂停封面 ') + card.song.title"
          @click="pick(card)"
        >
          <img :src="card.song.cover" alt="" />
          <strong>{{ card.song.title }}</strong>
          <span class="exhibit-credit">{{ card.song.artist }}</span>
        </button>
      </div>
    </div>
    <div class="gallery-info exhibit-copy">
      <p class="exhibit-meta">
        {{ selected.genre }}
        <span>/</span>
        {{ selected.duration ? time(selected.duration) : '—' }}
      </p>
      <h2 :title="selected.title">{{ selected.title }}</h2>
      <p class="exhibit-artist">{{ selected.artist }}</p>
      <div class="exhibit-actions">
        <button class="exhibit-play" :aria-label="'播放或暂停 ' + selected.title" @click="play">
          <Pause v-if="p.id === selected.id && p.playing" />
          <Play v-else />
          {{ p.id === selected.id && p.playing ? '暂停' : '播放' }}
        </button>
        <button class="exhibit-stage" @click="openStage">
          <AudioLines />
          {{ selected.lyrics.length ? '听歌看词' : '进入舞台' }}
        </button>
      </div>
    </div>
    <div class="exhibit-navigation">
      <button
        class="circle"
        aria-label="上一张封面"
        :disabled="items.length < 2"
        @click="shift(-1)"
      >
        <ChevronLeft />
      </button>
      <span class="gallery-count">
        {{ String(index + 1).padStart(2, '0') }}
        <i>/</i>
        {{ String(items.length).padStart(2, '0') }}
      </span>
      <button class="circle" aria-label="下一张封面" :disabled="items.length < 2" @click="shift(1)">
        <ChevronRight />
      </button>
    </div>
  </section>
</template>
