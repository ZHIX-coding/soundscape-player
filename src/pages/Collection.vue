<script setup>
import { computed, inject, ref } from 'vue'
import { Heart, Plus } from 'lucide-vue-next'
import CoverWall from '../components/CoverWall.vue'
import PlaylistArtwork from '../components/PlaylistArtwork.vue'
import PlaylistForm from '../components/PlaylistForm.vue'
import { songs } from '../data/songs'
import { useMusic } from '../stores/music'

const music = useMusic()
const search = inject('search')
const create = ref(false)
const query = computed(() => search.value.trim().toLowerCase())
const shelves = computed(() => {
  const catalog = new Map(songs.map((song) => [song.id, song]))
  return [
    {
      id: 'favorites',
      name: '我喜欢',
      tracks: music.favorites.map((id) => catalog.get(id)).filter(Boolean),
    },
    ...music.lists.map((list) => ({
      ...list,
      tracks: list.songIds.map((id) => catalog.get(id)).filter(Boolean),
    })),
  ].filter((item) => item.name.toLowerCase().includes(query.value))
})
</script>

<template>
  <section class="cover-room">
    <header class="cover-toolbar">
      <div class="cover-heading"><h1>歌单</h1></div>
      <button class="pill" @click="create = true">
        <Plus />
        新建歌单
      </button>
    </header>
    <CoverWall :items="shelves" label="歌单封面" :filter="query" :memory-key="'/my:' + query">
      <template #default="{ item, tabindex }">
        <RouterLink class="cover-open" :tabindex="tabindex" :to="'/playlist/' + item.id">
          <span v-if="item.id === 'favorites' && !item.tracks.length" class="cover-heart">
            <Heart />
          </span>
          <PlaylistArtwork v-else :tracks="item.tracks" />
          <span class="cover-caption">
            <b>{{ item.name }}</b>
            <small>{{ item.tracks.length }} 首</small>
          </span>
        </RouterLink>
      </template>
      <template #empty><p class="cover-empty">没有匹配的歌单</p></template>
    </CoverWall>
    <PlaylistForm v-if="create" @close="create = false" />
  </section>
</template>
