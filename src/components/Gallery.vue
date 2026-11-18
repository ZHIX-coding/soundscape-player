<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Play,
  Pause,
  GalleryHorizontalEnd,
  Orbit,
  PanelsTopLeft,
  AudioLines,
  Maximize2,
  ListMusic,
  Upload,
} from 'lucide-vue-next'
import SpatialBackdrop from './SpatialBackdrop.vue'
import { vHorizontalSwipe } from '../horizontalSwipe'
import { usePlayer } from '../stores/music'
import { read, save, time } from '../persistence'

const props = defineProps({ items: { type: Array, required: true }, canImport: Boolean })
defineEmits(['import', 'show-list'])
const modes = [
  { id: 'corridor', label: '横向', icon: GalleryHorizontalEnd },
  { id: 'orbit', label: '环形', icon: Orbit },
  { id: 'wall', label: '网格', icon: PanelsTopLeft },
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
const echoes = computed(() =>
  [-2, -1, 1, 2].map((offset) => props.items[wrap(index.value + offset)].cover),
)
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
  if (!canSwipe()) return
  selectedId.value = props.items[wrap(index.value + n)].id
}
const canSwipe = () => props.items.length > 1
function play() {
  if (p.id === selected.value.id) p.toggle()
  else
    p.select(
      selected.value.id,
      props.items.map((s) => s.id),
    )
}
function openStage(fullscreen = false) {
  p.select(
    selected.value.id,
    props.items.map((s) => s.id),
  )
  router.push({
    path: '/player',
    query: { from: router.currentRoute.value.path, show: fullscreen ? 'concert' : undefined },
  })
}
function moveView(event) {
  if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches)
    return
  const surface = event.currentTarget
  if (surface.hasAttribute('data-swiping')) return
  const box = surface.getBoundingClientRect()
  surface.style.setProperty('--look-x', ((event.clientX - box.left) / box.width - 0.5) * 6 + 'deg')
  surface.style.setProperty('--look-y', (0.5 - (event.clientY - box.top) / box.height) * 4 + 'deg')
}
function resetView(event) {
  event.currentTarget.style.removeProperty('--look-x')
  event.currentTarget.style.removeProperty('--look-y')
}
function pick(card) {
  if (card.offset) selectedId.value = card.song.id
  else play()
}
</script>
<template>
  <section
    v-if="selected"
    class="gallery exhibition"
    :class="'scene-' + mode"
    aria-label="封面"
    :aria-describedby="canSwipe() ? 'gallery-swipe-hint' : undefined"
    tabindex="0"
    @keydown.left.prevent="shift(-1)"
    @keydown.right.prevent="shift(1)"
  >
    <SpatialBackdrop :cover="selected.cover" :echoes="echoes" />
    <header class="exhibit-header">
      <h1 class="visually-hidden">封面</h1>
      <div class="exhibit-modes" role="group" aria-label="封面布局">
        <button v-for="m in modes" :key="m.id" :aria-pressed="mode === m.id" @click="mode = m.id">
          <component :is="m.icon" />
          {{ m.label }}
        </button>
      </div>
      <div class="exhibit-utilities">
        <button v-if="canImport" class="pill" @click="$emit('import')">
          <Upload />
          导入歌曲
        </button>
        <button class="pill" @click="$emit('show-list')">
          <ListMusic />
          列表
        </button>
      </div>
    </header>
    <div
      v-horizontal-swipe="{ step: shift, enabled: canSwipe }"
      class="exhibit-space"
      :class="{ swipeable: canSwipe() }"
      @pointermove="moveView"
      @pointerleave="resetView"
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
          <span class="sleeve-caption">
            <b>{{ card.song.title }}</b>
            <small>{{ card.song.artist }}</small>
          </span>
        </button>
      </div>
    </div>
    <div class="gallery-info exhibit-copy">
      <h2 :title="selected.title" aria-live="polite">{{ selected.title }}</h2>
      <p class="exhibit-artist">
        <span
          v-if="p.id === selected.id && p.playing"
          class="playing-dot"
          aria-label="正在播放"
        ></span>
        {{ selected.artist }}
        <span v-if="selected.duration">{{ time(selected.duration) }}</span>
      </p>
      <div class="exhibit-actions">
        <button class="exhibit-play" :aria-label="'播放或暂停 ' + selected.title" @click="play">
          <Pause v-if="p.id === selected.id && p.playing" />
          <Play v-else />
          {{ p.id === selected.id && p.playing ? '暂停' : '播放' }}
        </button>
        <button v-if="selected.lyrics.length" class="exhibit-stage" @click="openStage()">
          <AudioLines />
          歌词
        </button>
        <button class="exhibit-fullscreen" aria-label="全屏" title="全屏" @click="openStage(true)">
          <Maximize2 />
          <span>全屏</span>
        </button>
      </div>
      <p v-if="canSwipe()" id="gallery-swipe-hint" class="exhibit-swipe-hint">
        左右滑动或拖动
        <span class="visually-hidden">，也可以按左右方向键</span>
        <span class="gallery-count">{{ index + 1 }} / {{ items.length }}</span>
      </p>
    </div>
  </section>
</template>
