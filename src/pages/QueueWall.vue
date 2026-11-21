<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowUpRight,
  ChevronLeft,
  Heart,
  ListMusic,
  LocateFixed,
  MoreHorizontal,
  Pause,
  Play,
} from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import TrackActions from '../components/TrackActions.vue'
import QueueLyrics from '../components/QueueLyrics.vue'
import { songs } from '../data/songs'
import { vHorizontalSwipe } from '../horizontalSwipe'
import { playerFromQueue, queueLocation } from '../browseOrigin'
import { useAppearance } from '../stores/appearance'
import { queueTilePositions } from '../queueTilePositions'
import { time } from '../persistence'
import { useMusic, usePlayer } from '../stores/music'

const player = usePlayer()
const music = useMusic()
const appearance = useAppearance()
const route = useRoute()
const viewport = ref(null)
const grid = ref(null)
const menuSong = ref(null)
const tracks = computed(() => {
  const byId = new Map(songs.map((song) => [song.id, song]))
  return player.queue.map((id) => byId.get(id)).filter(Boolean)
})
const backTo = computed(() => {
  const { query } = queueLocation(route.query.from, route.query.origin)
  return query.from === 'player' ? { path: '/player', query: { from: query.origin } } : query.from
})
const columns = ref(8)
const visibleRows = ref(5)
const tiles = computed(() =>
  queueTilePositions(tracks.value, player.id, columns.value, visibleRows.value),
)
const edgeRows = computed(() =>
  tracks.value.length <= 3 ? Math.ceil(visibleRows.value / 2) + 1 : 0,
)
const repeatCovers = computed(() => {
  if (!tracks.value.length) return []
  const offset = tracks.value.findIndex((track) => track.id === player.id) + 1
  return Array.from(
    { length: columns.value },
    (_, index) => tracks.value[(offset + index) % tracks.value.length].cover,
  )
})
const duration = computed(() =>
  Number.isFinite(player.duration) && player.duration > 0 ? player.duration : 0,
)
const progress = computed(() =>
  duration.value ? Math.min(100, (player.position / duration.value) * 100) : 0,
)
const timeLabel = computed(() => time(player.position) + ' / ' + time(duration.value))
const favorite = computed(() => music.favorites.includes(player.id))
const canSwipe = () => tracks.value.length > 1
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)')
const animations = new Map()
let revision = 0
let keyboardSong
let resize

function visibleRects() {
  const box = viewport.value
  if (!box || !grid.value) return new Map()
  const bounds = box.getBoundingClientRect()
  const rects = new Map()
  for (const card of grid.value.querySelectorAll(':scope > .wall-tile')) {
    const rect = card.getBoundingClientRect()
    if (rect.bottom > bounds.top && rect.top < bounds.bottom) rects.set(card, rect)
  }
  return rects
}

function stopAnimations() {
  for (const animation of animations.values()) animation.cancel()
  animations.clear()
  grid.value?.querySelector('[data-moving]')?.removeAttribute('data-moving')
}

function centerCurrent() {
  const box = viewport.value
  const card = grid.value?.querySelector('.wall-current')
  if (!box || !card) return null
  const bounds = box.getBoundingClientRect()
  const rect = card.getBoundingClientRect()
  const controlsSpace = parseFloat(getComputedStyle(box).getPropertyValue('--wall-controls-space'))
  const center = bounds.top + (box.clientHeight - controlsSpace) / 2
  box.scrollTop += rect.top + rect.height / 2 - center
  return card
}

function animateCards(before, current) {
  const after = visibleRects()
  for (const [card, end] of after) {
    const start = before.get(card)
    if (!start && card !== current) continue
    const x = start ? start.left - end.left : 0
    const y = start ? start.top - end.top : 18
    const sx = start ? start.width / end.width : 0.96
    const sy = start ? start.height / end.height : 0.96
    if (Math.abs(x) + Math.abs(y) < 1 && Math.abs(sx - 1) + Math.abs(sy - 1) < 0.01) continue
    if (card === current) card.dataset.moving = ''
    const animation = card.animate(
      [
        { transform: `translate(${x}px, ${y}px) scale(${sx}, ${sy})`, opacity: start ? 1 : 0.62 },
        { transform: 'none', opacity: 1 },
      ],
      {
        duration: start ? 520 : 250,
        easing: 'cubic-bezier(.22,.72,.22,1)',
      },
    )
    animations.set(card, animation)
    animation.onfinish = () => {
      if (animations.get(card) !== animation) return
      animations.delete(card)
      card.removeAttribute('data-moving')
    }
  }
}

async function focusCurrent({ animate = false, focus = false } = {}) {
  const ticket = ++revision
  const shouldAnimate = animate && !appearance.reduceMotion && !systemMotion.matches
  const before = shouldAnimate ? visibleRects() : null
  await nextTick()
  if (ticket !== revision) return
  stopAnimations()
  const card = centerCurrent()
  if (!card) return
  if (before) animateCards(before, card)
  if (focus) card.querySelector('.wall-detail')?.focus({ preventScroll: true })
}

// Capture the currently painted positions before Vue expands the next card.
watch(
  () => player.id,
  (id) => {
    const focus = keyboardSong === id || !!menuSong.value
    menuSong.value = null
    keyboardSong = undefined
    focusCurrent({ animate: true, focus })
  },
  { flush: 'pre' },
)

function choose(song, event) {
  if (event.detail === 0) keyboardSong = song.id
  player.select(song.id)
}

function recenter() {
  focusCurrent()
}

onMounted(() => {
  async function updateColumns() {
    const box = viewport.value
    if (!box) return
    const width = box.clientWidth
    columns.value = width <= 540 ? 3 : width < 920 ? 6 : 8
    await nextTick()
    if (!grid.value || !viewport.value) return
    const style = getComputedStyle(grid.value)
    const rowStep = parseFloat(style.gridAutoRows) + parseFloat(style.rowGap)
    const height = box.clientHeight
    if (rowStep > 0) visibleRows.value = Math.max(1, Math.ceil(height / rowStep))
    recenter()
  }
  updateColumns()
  resize = new ResizeObserver(updateColumns)
  resize.observe(viewport.value)
  systemMotion.addEventListener('change', recenter)
})
watch(() => appearance.reduceMotion, recenter)
onBeforeUnmount(() => {
  revision++
  stopAnimations()
  resize?.disconnect()
  systemMotion.removeEventListener('change', recenter)
})
</script>

<template>
  <section
    class="queue-wall"
    :class="{ 'reduce-motion': appearance.reduceMotion }"
    aria-labelledby="wall-heading"
  >
    <header class="wall-header">
      <RouterLink class="wall-round" :to="backTo" aria-label="返回" title="返回">
        <ChevronLeft />
      </RouterLink>
      <h1 id="wall-heading" class="visually-hidden">拼贴</h1>
    </header>
    <div ref="viewport" class="wall-viewport" role="region" aria-label="播放队列" tabindex="0">
      <div
        v-if="tracks.length"
        ref="grid"
        v-horizontal-swipe="{ step: player.step, enabled: canSwipe }"
        class="wall-grid"
        :style="{
          '--wall-columns': columns,
          '--wall-edge-rows': edgeRows,
        }"
      >
        <div
          class="wall-repeats"
          :class="{
            'wall-repeats-solo': tracks.length === 1,
            'wall-repeats-short': edgeRows > 0,
          }"
          aria-hidden="true"
        >
          <div class="wall-repeat-bands">
            <i
              v-for="(cover, index) in repeatCovers"
              :key="index"
              :style="{
                '--repeat-cover': 'url(' + JSON.stringify(cover) + ')',
                '--repeat-band-crop': (index % 4) * 17 + '%',
              }"
            />
          </div>
          <div
            v-for="(tile, index) in tiles.repeats"
            :key="tile.row + ':' + tile.col"
            class="wall-repeat"
            :style="{
              '--repeat-image': 'url(' + JSON.stringify(tile.cover) + ')',
              '--repeat-row': tile.row,
              '--repeat-col': tile.col,
              '--repeat-crop': index % 5,
            }"
          ></div>
        </div>
        <article
          v-for="(song, index) in tracks"
          :key="song.id"
          class="wall-tile"
          :class="{ 'wall-current': song.id === player.id }"
          :style="tiles.positions[index]"
          :data-track-id="song.id"
        >
          <img
            :src="song.cover"
            alt=""
            :loading="song.id === player.id ? 'eager' : 'lazy'"
            decoding="async"
          />
          <template v-if="song.id === player.id">
            <div class="wall-current-title">
              <small>{{ player.playing ? '正在播放' : '当前曲目' }}</small>
              <h2>{{ song.title }}</h2>
              <p>{{ song.artist }}</p>
            </div>
            <QueueLyrics :key="song.id" />
            <div class="wall-corner-actions">
              <button
                class="wall-round wall-favorite"
                type="button"
                aria-label="收藏当前曲目"
                :title="favorite ? '取消收藏' : '收藏当前曲目'"
                :aria-pressed="favorite"
                @click="music.favorite(song.id)"
              >
                <Heart aria-hidden="true" />
              </button>
              <RouterLink
                class="wall-round wall-detail"
                :to="playerFromQueue(route.query)"
                aria-label="打开播放详情"
                title="打开播放详情"
              >
                <ArrowUpRight aria-hidden="true" />
              </RouterLink>
            </div>
            <div class="wall-current-actions">
              <button
                class="wall-round wall-play"
                :aria-label="player.playing ? '暂停当前曲目' : '播放当前曲目'"
                @click="player.toggle"
              >
                <Pause v-if="player.playing" />
                <Play v-else />
              </button>
              <span class="wall-time">{{ timeLabel }}</span>
              <button
                class="wall-round wall-more"
                type="button"
                aria-label="更多操作"
                title="更多操作"
                aria-haspopup="dialog"
                @click="menuSong = song"
              >
                <MoreHorizontal aria-hidden="true" />
              </button>
            </div>
            <input
              class="wall-progress"
              type="range"
              min="0"
              :max="duration"
              step="0.1"
              :disabled="duration === 0"
              :value="player.position"
              :style="{ '--wall-progress': progress + '%' }"
              aria-label="当前曲目进度"
              :aria-valuetext="timeLabel"
              @input="player.seek($event.target.value)"
            />
          </template>
          <button
            v-else
            class="wall-pick"
            :aria-label="'播放 ' + song.title"
            @click="choose(song, $event)"
          >
            <small class="wall-index">{{ index + 1 }}</small>
            <span class="wall-tile-label">
              <b>{{ song.title }}</b>
              <small>{{ song.artist }}</small>
            </span>
          </button>
        </article>
      </div>
      <div v-else class="library-empty">
        <ListMusic aria-hidden="true" />
        <h2>播放队列为空</h2>
        <RouterLink class="pill" to="/local">本地</RouterLink>
      </div>
    </div>
    <button
      v-if="player.song"
      class="wall-round wall-locate"
      aria-label="定位当前曲目"
      title="定位当前曲目"
      @click="focusCurrent({ animate: true, focus: true })"
    >
      <LocateFixed />
    </button>
    <TrackActions v-if="menuSong" :song="menuSong" @close="menuSong = null" />
  </section>
</template>
