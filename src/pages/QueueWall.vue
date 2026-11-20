<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowUpRight, ChevronLeft, ListMusic, LocateFixed, Pause, Play } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import QueueLyrics from '../components/QueueLyrics.vue'
import { songs } from '../data/songs'
import { vHorizontalSwipe } from '../horizontalSwipe'
import { playerFromQueue, queueLocation } from '../browseOrigin'
import { useAppearance } from '../stores/appearance'
import { usePlayer } from '../stores/music'

const player = usePlayer()
const appearance = useAppearance()
const route = useRoute()
const viewport = ref(null)
const grid = ref(null)
const tracks = computed(() => {
  const byId = new Map(songs.map((song) => [song.id, song]))
  return player.queue.map((id) => byId.get(id)).filter(Boolean)
})
const backTo = computed(() => {
  const { query } = queueLocation(route.query.from, route.query.origin)
  return query.from === 'player' ? { path: '/player', query: { from: query.origin } } : query.from
})
const currentIndex = computed(() => tracks.value.findIndex((song) => song.id === player.id))
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
  for (const card of grid.value.children) {
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
  const controlsSpace = parseFloat(getComputedStyle(box).paddingBottom)
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
    const focus = keyboardSong === id
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
  centerCurrent()
  resize = new ResizeObserver(recenter)
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
      <small v-if="tracks.length">{{ tracks.length }} 首</small>
    </header>
    <div ref="viewport" class="wall-viewport" role="region" aria-label="播放队列" tabindex="0">
      <div
        v-if="tracks.length"
        ref="grid"
        v-horizontal-swipe="{ step: player.step, enabled: canSwipe }"
        class="wall-grid"
      >
        <article
          v-for="(song, index) in tracks"
          :key="song.id"
          class="wall-tile"
          :class="{
            'wall-current': song.id === player.id,
            'wall-wide': index % 9 === 4 && Math.abs(index - currentIndex) > 9,
          }"
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
            <RouterLink
              class="wall-round wall-detail"
              :to="playerFromQueue(route.query)"
              aria-label="打开播放详情"
              title="打开播放详情"
            >
              <ArrowUpRight aria-hidden="true" />
            </RouterLink>
            <div class="wall-current-actions">
              <button
                class="wall-round wall-play"
                :aria-label="player.playing ? '暂停当前曲目' : '播放当前曲目'"
                @click="player.toggle"
              >
                <Pause v-if="player.playing" />
                <Play v-else />
              </button>
            </div>
            <progress
              class="wall-progress"
              :value="player.position"
              :max="player.duration || 1"
              aria-label="当前曲目进度"
            ></progress>
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
  </section>
</template>
