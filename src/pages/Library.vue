<script setup>
import { ref, computed, inject, watch } from 'vue'
import { SlidersHorizontal, List, GalleryHorizontalEnd } from 'lucide-vue-next'
import Gallery from '../components/Gallery.vue'
import ImportTrack from '../components/ImportTrack.vue'
import SongTable from '../components/SongTable.vue'
import PopPicks from '../components/PopPicks.vue'
import { useRoute, useRouter } from 'vue-router'
import { songs } from '../data/songs'
import { catalogNotice } from '../data/remote'
import { read, save } from '../persistence'
const route = useRoute()
const router = useRouter()
function showPicks(open) {
  router.replace({ query: { ...route.query, picks: open ? 'pop' : undefined } })
}
const search = inject('search'),
  importing = ref(false),
  genre = ref('全部'),
  sort = ref('默认排序'),
  filters = ref(false),
  gallery = ref(read('gallery', true) !== false)
watch(gallery, (v) => save('gallery', v))
const items = computed(() => {
  const out = songs.filter(
    (s) =>
      (genre.value === '全部' || genre.value === s.genre) &&
      [s.title, s.artist, s.english]
        .join(' ')
        .toLowerCase()
        .includes(search.value.trim().toLowerCase()),
  )
  if (sort.value === '曲名排序') out.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  if (sort.value === '时长排序') out.sort((a, b) => a.duration - b.duration)
  return out
})
</script>
<template>
  <Gallery v-if="gallery && items.length" :items="items" />
  <section class="catalog">
    <p v-if="catalogNotice" role="status">{{ catalogNotice }}</p>
    <header class="row">
      <div class="section-title">
        <h2>
          {{ search.trim() || genre !== '全部' ? '匹配曲目' : '全部曲目' }}
          <small>{{ String(items.length).padStart(2, '0') }}</small>
        </h2>
      </div>
      <div class="actions">
        <button class="pill" @click="showPicks(true)">华语流行精选</button>
        <button class="pill" @click="importing = true">导入歌曲</button>
        <button class="pill" :aria-expanded="filters" @click="filters = !filters">
          <SlidersHorizontal />
          筛选排序
        </button>
        <button
          class="pill"
          :aria-label="gallery ? '切换为列表' : '显示封面展厅'"
          @click="gallery = !gallery"
        >
          <List v-if="gallery" />
          <GalleryHorizontalEnd v-else />
        </button>
      </div>
    </header>
    <div v-if="filters" class="filterbar">
      <select v-model="genre" aria-label="风格">
        <option v-for="g in ['全部', ...new Set(songs.map((s) => s.genre))]" :key="g">
          {{ g }}
        </option>
      </select>
      <select v-model="sort" aria-label="排序">
        <option>默认排序</option>
        <option>曲名排序</option>
        <option>时长排序</option>
      </select>
    </div>
    <SongTable v-if="items.length" :items="items" />
    <div v-else class="empty">
      没有找到匹配的曲目。
      <button
        class="pill"
        @click="
          () => {
            genre = '全部'
            search = ''
          }
        "
      >
        清除条件
      </button>
    </div>
  </section>
  <PopPicks v-if="route.query.picks === 'pop'" @close="showPicks(false)" />
  <ImportTrack
    v-if="importing"
    @close="importing = false"
    @imported="
      () => {
        search = ''
        genre = '全部'
        sort = '默认排序'
      }
    "
  />
</template>
