<script setup>
import { computed, ref } from 'vue'
import { ChevronLeft, Mic2 } from 'lucide-vue-next'
import SongTable from '../components/SongTable.vue'
import { songs } from '../data/songs'

const selected = ref('')
const artists = computed(() => {
  const groups = new Map()
  for (const song of songs) {
    const name = song.artist || '未知歌手'
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(song)
  }
  return [...groups.entries()].sort(([first], [second]) => first.localeCompare(second, 'zh-CN'))
})
</script>

<template>
  <section v-if="!artists.length" class="library-empty">
    <Mic2 aria-hidden="true" />
    <h1>歌手</h1>
    <p>曲库中的歌曲会按歌手归类。</p>
    <RouterLink class="pill" to="/local">打开本地曲库</RouterLink>
  </section>
  <section v-else-if="selected" class="artists-view">
    <button class="pill" @click="selected = ''">
      <ChevronLeft />
      全部歌手
    </button>
    <h1>{{ selected }}</h1>
    <SongTable :items="artists.find(([name]) => name === selected)?.[1] ?? []" />
  </section>
  <section v-else class="artists-view">
    <h1>歌手</h1>
    <div class="artist-grid">
      <button
        v-for="[name, tracks] in artists"
        :key="name"
        class="artist-card"
        @click="selected = name"
      >
        <img :src="tracks[0].cover" alt="" loading="lazy" />
        <b>{{ name }}</b>
        <small>{{ tracks.length }} 首歌曲</small>
      </button>
    </div>
  </section>
</template>
