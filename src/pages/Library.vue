<script setup>
import { ref, computed, inject, watch } from 'vue'
import { SlidersHorizontal, List, GalleryHorizontalEnd, Upload, Disc3 } from 'lucide-vue-next'
import Gallery from '../components/Gallery.vue'
import ImportTrack from '../components/ImportTrack.vue'
import SongTable from '../components/SongTable.vue'
import { songs } from '../data/songs'
import { catalogNotice } from '../data/remote'
import { read, save } from '../persistence'
const props = defineProps({ local: Boolean })
const search = inject('search'),
  importing = ref(false),
  genre = ref('全部'),
  sort = ref('默认排序'),
  filters = ref(false),
  gallery = ref(read('gallery', true) !== false)
watch(gallery, (v) => save('gallery', v))
const catalogHeading = ref(null)
const catalog = computed(() => songs.filter((song) => song.id.startsWith('local-') === props.local))
function showList() {
  catalogHeading.value?.focus({ preventScroll: true })
  catalogHeading.value?.scrollIntoView({
    block: 'start',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}
const items = computed(() => {
  const out = catalog.value.filter(
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
  <Gallery
    v-if="gallery && items.length"
    :items="items"
    :can-import="local"
    @import="importing = true"
    @show-list="showList"
  />
  <section v-if="catalog.length" class="catalog" aria-labelledby="catalog-heading">
    <p v-if="!local && catalogNotice" role="status">{{ catalogNotice }}</p>
    <header class="row">
      <div class="section-title">
        <h2 id="catalog-heading" ref="catalogHeading" tabindex="-1">
          {{ search.trim() || genre !== '全部' ? '匹配曲目' : '全部曲目' }}
          <small>{{ items.length }} 首</small>
        </h2>
      </div>
      <div class="actions">
        <button
          v-if="local && (!gallery || !items.length)"
          class="pill import-button"
          @click="importing = true"
        >
          <Upload />
          导入歌曲
        </button>
        <button class="pill" :aria-expanded="filters" @click="filters = !filters">
          <SlidersHorizontal />
          筛选排序
        </button>
        <button class="pill" :title="gallery ? '列表' : '封面'" @click="gallery = !gallery">
          <List v-if="gallery" />
          <GalleryHorizontalEnd v-else />
          {{ gallery ? '列表' : '封面' }}
        </button>
      </div>
    </header>
    <div v-if="filters" class="filterbar">
      <select v-model="genre" aria-label="风格">
        <option v-for="g in ['全部', ...new Set(catalog.map((s) => s.genre))]" :key="g">
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
  <section v-else class="library-empty empty-shelf">
    <button v-if="local" class="empty-sleeve" aria-label="导入歌曲" @click="importing = true">
      <span class="empty-album"><Disc3 aria-hidden="true" /></span>
      <span>
        <Upload />
        导入歌曲
      </span>
    </button>
    <Disc3 v-else aria-hidden="true" />
    <h1>{{ local ? '本地曲库' : '发现' }}</h1>
    <p>{{ local ? '导入电脑上的音乐，可附上封面和 LRC 歌词。' : '发现曲库暂时没有曲目。' }}</p>
    <p v-if="!local && catalogNotice" role="status">{{ catalogNotice }}</p>
    <RouterLink v-if="!local" class="pill" to="/local">打开本地曲库</RouterLink>
  </section>
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
