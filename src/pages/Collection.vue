<script setup>
import { ref, computed } from 'vue'
import { Plus, ChevronRight } from 'lucide-vue-next'
import PlaylistArtwork from '../components/PlaylistArtwork.vue'
import PlaylistForm from '../components/PlaylistForm.vue'
import SongTable from '../components/SongTable.vue'
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
</script>
<template>
  <div class="collection-head">
    <div>
      <h1>我的音乐</h1>
      <p>{{ m.lists.length }} 张歌单 · {{ liked.length }} 首收藏</p>
    </div>
    <button class="pill" @click="create = true">
      <Plus />
      新建歌单
    </button>
  </div>
  <header class="row">
    <h2>
      我的歌单
      <small>{{ m.lists.length }}</small>
    </h2>
  </header>
  <div class="lists">
    <RouterLink
      v-for="l in playlists"
      :key="l.id"
      class="list-card mixtape-card"
      :to="'/playlist/' + l.id"
    >
      <PlaylistArtwork :tracks="l.tracks" />
      <div>
        <b>{{ l.name }}</b>
        <small>{{ l.songIds.length }} 首曲目</small>
      </div>
      <ChevronRight />
    </RouterLink>
    <div v-if="!m.lists.length" class="shelf-empty">
      <PlaylistArtwork :tracks="[]" />
      <div>
        <h3>还没有歌单。</h3>
        <p>把想一起听的歌放进同一张歌单。</p>
        <button class="pill" @click="create = true">
          <Plus />
          创建第一张歌单
        </button>
      </div>
    </div>
  </div>
  <h2>
    我的收藏
    <small>{{ liked.length }}</small>
  </h2>
  <SongTable v-if="liked.length" :items="liked" />
  <div v-else class="empty">
    点击曲目旁的爱心，即可在这里找到它。
    <RouterLink to="/library">浏览曲库 →</RouterLink>
  </div>
  <PlaylistForm v-if="create" @close="create = false" />
</template>
