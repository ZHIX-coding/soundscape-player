<script setup>
import { ref, computed } from 'vue'
import { Plus, Heart, LibraryBig } from 'lucide-vue-next'
import PlaylistArtwork from '../components/PlaylistArtwork.vue'
import PlaylistForm from '../components/PlaylistForm.vue'
import SpatialBackdrop from '../components/SpatialBackdrop.vue'
import SongTable from '../components/SongTable.vue'
import { vHorizontalSwipe } from '../horizontalSwipe'
import { songs } from '../data/songs'
import { useMusic } from '../stores/music'
const m = useMusic(),
  create = ref(false)
const liked = computed(() => songs.filter((s) => m.favorites.includes(s.id)))
const playlists = computed(() => {
  const catalog = new Map(songs.map((s) => [s.id, s]))
  return m.lists.map((list) => ({
    ...list,
    tracks: list.songIds.map((id) => catalog.get(id)).filter(Boolean),
  }))
})
const shelves = computed(() => [
  { id: null, name: '我喜欢', tracks: liked.value },
  ...playlists.value,
])
const activeId = ref(null)
const index = computed(() =>
  Math.max(
    0,
    shelves.value.findIndex((item) => item.id === activeId.value),
  ),
)
const active = computed(() => shelves.value[index.value])
const displayed = computed(() => shelves.value.slice(Math.max(0, index.value - 2), index.value + 3))
const echoes = computed(() =>
  [
    ...new Set(
      shelves.value.flatMap((item) => item.tracks.slice(0, 3).map((track) => track.cover)),
    ),
  ].slice(0, 4),
)
const favoritesHeading = ref(null)
const canSwipe = () => shelves.value.length > 1
function shift(offset) {
  const next = shelves.value[index.value + offset]
  if (next) activeId.value = next.id
}
function openFavorites() {
  activeId.value = null
  favoritesHeading.value?.focus({ preventScroll: true })
  favoritesHeading.value?.scrollIntoView({
    block: 'start',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}
</script>
<template>
  <section
    class="gallery exhibition collection-shelf"
    aria-label="歌单"
    :aria-describedby="canSwipe() ? 'shelf-swipe-hint' : undefined"
    tabindex="0"
    @keydown.left.prevent="shift(-1)"
    @keydown.right.prevent="shift(1)"
  >
    <SpatialBackdrop :cover="active.tracks[0]?.cover" :echoes="echoes" />
    <header class="shelf-toolbar">
      <h1 class="visually-hidden">歌单</h1>
      <button class="pill" @click="create = true">
        <Plus />
        新建歌单
      </button>
    </header>
    <div
      v-horizontal-swipe="{ step: shift, enabled: canSwipe }"
      class="exhibit-space"
      :class="{ swipeable: canSwipe() }"
    >
      <div class="exhibit-rack shelf-rack">
        <template v-for="item in displayed" :key="item.id ?? 'favorites'">
          <RouterLink
            v-if="item.id"
            class="sleeve shelf-tile list-card"
            :class="'pos' + (shelves.indexOf(item) - index)"
            :to="'/playlist/' + item.id"
          >
            <PlaylistArtwork :tracks="item.tracks" />
            <span class="sleeve-caption">
              <b>{{ item.name }}</b>
              <small>{{ item.tracks.length }} 首曲目</small>
            </span>
          </RouterLink>
          <button
            v-else
            class="sleeve shelf-tile favorites-tile"
            :class="'pos' + (shelves.indexOf(item) - index)"
            @click="openFavorites"
          >
            <span class="favorites-cover"><Heart aria-hidden="true" /></span>
            <span class="sleeve-caption">
              <b>我喜欢</b>
              <small>{{ liked.length }} 首收藏</small>
            </span>
          </button>
        </template>
      </div>
    </div>
    <div class="gallery-info exhibit-copy">
      <h2 aria-live="polite">{{ active.name }}</h2>
      <p>{{ active.tracks.length }} 首曲目</p>
      <div class="exhibit-actions">
        <RouterLink v-if="active.id" class="exhibit-play" :to="'/playlist/' + active.id">
          打开歌单
        </RouterLink>
        <button v-else class="exhibit-play" @click="openFavorites">
          <LibraryBig />
          查看收藏
        </button>
      </div>
      <p v-if="canSwipe()" id="shelf-swipe-hint" class="exhibit-swipe-hint">
        左右滑动或拖动
        <span class="visually-hidden">，也可以按左右方向键</span>
        <span class="gallery-count">{{ index + 1 }} / {{ shelves.length }}</span>
      </p>
    </div>
  </section>
  <section class="catalog favorites-catalog">
    <h2 ref="favoritesHeading" tabindex="-1">
      我的收藏
      <small>{{ liked.length }}</small>
    </h2>
    <SongTable v-if="liked.length" :items="liked" />
    <div v-else class="empty">
      点击曲目旁的爱心，即可在这里找到它。
      <RouterLink to="/library">浏览曲库 →</RouterLink>
    </div>
    <p v-if="!m.lists.length" class="collection-empty-note">还没有歌单。</p>
  </section>
  <PlaylistForm v-if="create" @saved="activeId = $event" @close="create = false" />
</template>
