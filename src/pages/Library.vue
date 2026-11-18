<script setup>
import { computed, inject, ref } from 'vue'
import { SlidersHorizontal, Upload } from 'lucide-vue-next'
import ImportTrack from '../components/ImportTrack.vue'
import Modal from '../components/Modal.vue'
import TrackWall from '../components/TrackWall.vue'
import { songs } from '../data/songs'
import { catalogNotice } from '../data/remote'

const props = defineProps({ local: Boolean })
const search = inject('search')
const importing = ref(false)
const filterOpen = ref(false)
const genre = ref('')
const order = ref('')
const catalog = computed(() => songs.filter((song) => song.id.startsWith('local-') === props.local))
const genres = computed(() => [...new Set(catalog.value.map((song) => song.genre))].filter(Boolean))
const tracks = computed(() => {
  const result = catalog.value.filter((song) => !genre.value || song.genre === genre.value)
  if (order.value === 'title') result.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  if (order.value === 'duration') result.sort((a, b) => a.duration - b.duration)
  return result
})
</script>

<template>
  <TrackWall :label="local ? '本地' : '发现'" :tracks="tracks" :view-key="genre + ':' + order">
    <template #actions>
      <button
        v-if="catalog.length"
        class="icon pill"
        aria-label="筛选与排序"
        title="筛选与排序"
        @click="filterOpen = true"
      >
        <SlidersHorizontal />
      </button>
      <button v-if="local" class="pill" @click="importing = true">
        <Upload />
        导入歌曲
      </button>
    </template>
    <template #empty>
      <p v-if="!local && catalogNotice" role="status">{{ catalogNotice }}</p>
      <p v-else>{{ local ? '暂无本地歌曲' : '暂无曲目' }}</p>
    </template>
  </TrackWall>
  <Modal v-if="filterOpen" title="筛选与排序" @close="filterOpen = false">
    <label v-if="genres.length > 1">
      风格
      <select v-model="genre">
        <option value="">全部</option>
        <option v-for="name in genres" :key="name">{{ name }}</option>
      </select>
    </label>
    <label>
      排序
      <select v-model="order">
        <option value="">默认</option>
        <option value="title">曲名</option>
        <option value="duration">时长</option>
      </select>
    </label>
  </Modal>
  <ImportTrack v-if="importing" @close="importing = false" @imported="search = ''" />
</template>
