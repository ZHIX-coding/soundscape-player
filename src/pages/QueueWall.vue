<script setup>
import { computed, ref } from 'vue'
import { ChevronLeft, LocateFixed, ListMusic, Play, Pause } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { songs } from '../data/songs'
import { vHorizontalSwipe } from '../horizontalSwipe'
import { usePlayer } from '../stores/music'

const player = usePlayer()
const route = useRoute()
const wall = ref(null)
const tracks = computed(() => {
  const byId = new Map(songs.map((song) => [song.id, song]))
  return player.queue.map((id) => byId.get(id)).filter(Boolean)
})
const current = computed(() => player.song)
const canSwipe = () => tracks.value.length > 1
const lyric = computed(
  () => current.value?.lyrics?.findLast((line) => line.start <= player.position)?.text,
)
function locate() {
  const tile = wall.value?.querySelector('.wall-play')
  tile?.closest('.wall-current')?.scrollIntoView({
    block: 'start',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
  tile?.focus({ preventScroll: true })
}
</script>

<template>
  <section ref="wall" class="queue-wall" aria-labelledby="wall-heading">
    <header class="wall-header">
      <RouterLink
        class="wall-round"
        :to="route.query.from === 'player' ? '/player' : '/library'"
        :aria-label="route.query.from === 'player' ? '正在播放' : '返回发现'"
        :title="route.query.from === 'player' ? '正在播放' : '返回发现'"
      >
        <ChevronLeft />
      </RouterLink>
      <h1 id="wall-heading" class="visually-hidden">拼贴</h1>
      <small v-if="tracks.length">{{ tracks.length }} 首</small>
    </header>
    <div
      v-if="tracks.length"
      v-horizontal-swipe="{ step: player.step, enabled: canSwipe }"
      class="wall-grid"
      :class="{ 'wall-solo': tracks.length === 1, swipeable: canSwipe() }"
    >
      <template v-for="(song, index) in tracks" :key="song.id">
        <article v-if="song.id === player.id" class="wall-tile wall-current">
          <img :src="song.cover" alt="" />
          <div class="wall-current-title">
            <small>{{ player.playing ? '正在播放' : '当前曲目' }} · {{ index + 1 }}</small>
            <h2>{{ song.title }}</h2>
            <p>{{ song.artist }}</p>
          </div>
          <p v-if="lyric" class="wall-lyric">{{ lyric }}</p>
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
        </article>
        <button
          v-else
          class="wall-tile"
          :class="{ 'wall-wide': index > 10 && index % 5 === 2 }"
          :aria-label="'播放 ' + song.title"
          @click="player.select(song.id)"
        >
          <img :src="song.cover" alt="" loading="lazy" />
          <small class="wall-index">{{ index + 1 }}</small>
          <span class="wall-tile-label">
            <b>{{ song.title }}</b>
            <small>{{ song.artist }}</small>
          </span>
        </button>
      </template>
    </div>
    <div v-else class="library-empty">
      <ListMusic aria-hidden="true" />
      <h2>播放队列为空</h2>
      <RouterLink class="pill" to="/local">打开本地曲库</RouterLink>
    </div>
    <button
      v-if="current"
      class="wall-round wall-locate"
      aria-label="定位当前曲目"
      title="定位当前曲目"
      @click="locate"
    >
      <LocateFixed />
    </button>
  </section>
</template>
