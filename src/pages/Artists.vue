<script setup>
import { computed, inject } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import CoverWall from '../components/CoverWall.vue'
import TrackWall from '../components/TrackWall.vue'
import { songs } from '../data/songs'

const route = useRoute()
const search = inject('search')
const query = computed(() => search.value.trim().toLowerCase())
const artists = computed(() => {
  const groups = new Map()
  for (const song of songs) {
    if (!groups.has(song.artist)) groups.set(song.artist, [])
    groups.get(song.artist).push(song)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
    .map(([name, tracks]) => ({ id: name, tracks }))
})
const selected = computed(() => artists.value.find((artist) => artist.id === route.params.name))
const items = computed(() =>
  artists.value.filter((artist) => artist.id.toLowerCase().includes(query.value)),
)
</script>

<template>
  <TrackWall v-if="selected" :label="selected.id" :tracks="selected.tracks" show-count>
    <template #back>
      <RouterLink to="/artists" class="icon" aria-label="返回歌手"><ChevronLeft /></RouterLink>
    </template>
  </TrackWall>
  <section v-else class="cover-room">
    <header class="cover-toolbar">
      <div class="cover-heading"><h1>歌手</h1></div>
    </header>
    <CoverWall :items="items" label="歌手封面" :filter="query" :memory-key="'/artists:' + query">
      <template #default="{ item, index, tabindex }">
        <RouterLink
          class="cover-open"
          :tabindex="tabindex"
          :to="{ name: 'artist', params: { name: item.id } }"
        >
          <img
            :src="item.tracks[0].cover"
            alt=""
            :loading="index < 12 ? 'eager' : 'lazy'"
            decoding="async"
          />
          <span class="cover-caption">
            <b>{{ item.id }}</b>
            <small>{{ item.tracks.length }} 首</small>
          </span>
        </RouterLink>
      </template>
      <template #empty>
        <p class="cover-empty">{{ query ? '没有匹配的歌手' : '暂无歌手' }}</p>
      </template>
    </CoverWall>
  </section>
</template>
