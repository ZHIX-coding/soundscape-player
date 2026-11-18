<script setup>
import { computed, inject, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Heart, ListPlus, MoreHorizontal, Pause, Play, Plus, Trash2 } from 'lucide-vue-next'
import { useMusic, usePlayer } from '../stores/music'
import CoverWall from './CoverWall.vue'
import CoverBackdrop from './CoverBackdrop.vue'
import Modal from './Modal.vue'
import PlaylistForm from './PlaylistForm.vue'

const props = defineProps({
  tracks: { type: Array, required: true },
  label: { type: String, required: true },
  removable: Boolean,
  viewKey: { type: String, default: '' },
})
const emit = defineEmits(['remove'])
const search = inject('search')
const route = useRoute()
const music = useMusic()
const player = usePlayer()
const chosen = ref(null)
const preview = ref(null)
const creating = ref(false)
const query = computed(() => search.value.trim().toLowerCase())
const items = computed(() =>
  props.tracks.filter((song) =>
    [song.title, song.artist, song.english].join(' ').toLowerCase().includes(query.value),
  ),
)
const cover = computed(() => {
  const current = player.song
  if (player.playing && current && items.value.includes(current)) return current.cover
  return (items.value.includes(preview.value) ? preview.value : items.value[0])?.cover
})
function play(song) {
  if (player.id === song.id && player.playing) player.toggle()
  else
    player.select(
      song.id,
      items.value.map((track) => track.id),
    )
}
function enqueue() {
  player.enqueue(chosen.value.id)
  chosen.value = null
}
function remove() {
  emit('remove', chosen.value.id)
  chosen.value = null
}
function addTo(id) {
  music.add(id, chosen.value.id)
  chosen.value = null
}
</script>

<template>
  <section class="cover-room">
    <CoverBackdrop v-if="cover" :cover="cover" />
    <header class="cover-toolbar">
      <div class="cover-heading">
        <slot name="back" />
        <h1>{{ label }}</h1>
        <span>{{ items.length }} 首</span>
      </div>
      <div class="cover-tools"><slot name="actions" /></div>
    </header>
    <CoverWall
      :items="items"
      :label="label + '封面'"
      :filter="viewKey + query"
      :memory-key="route.path + ':' + viewKey + ':' + query"
      @preview="preview = $event"
    >
      <template #default="{ item, index, tabindex }">
        <button
          class="cover-open"
          type="button"
          :tabindex="tabindex"
          :aria-label="(player.playing && player.id === item.id ? '暂停 ' : '播放 ') + item.title"
          :class="{ 'is-current': player.id === item.id }"
          :aria-current="player.id === item.id ? 'true' : undefined"
          @click="play(item)"
        >
          <img :src="item.cover" alt="" :loading="index < 12 ? 'eager' : 'lazy'" decoding="async" />
          <span class="cover-caption">
            <b>{{ item.title }}</b>
            <small>{{ item.artist }}</small>
          </span>
          <span class="cover-play">
            <Pause v-if="player.playing && player.id === item.id" />
            <Play v-else />
          </span>
        </button>
        <div class="cover-card-actions">
          <button
            :aria-label="'收藏 ' + item.title"
            :aria-pressed="music.favorites.includes(item.id)"
            :tabindex="tabindex"
            type="button"
            @click="music.favorite(item.id)"
          >
            <Heart />
          </button>
          <button
            :aria-label="item.title + ' 更多操作'"
            :tabindex="tabindex"
            type="button"
            @click="chosen = item"
          >
            <MoreHorizontal />
          </button>
        </div>
      </template>
      <template #empty>
        <div class="cover-empty">
          <p v-if="query">没有匹配的曲目</p>
          <slot v-else name="empty">暂无曲目</slot>
        </div>
      </template>
    </CoverWall>
    <Modal v-if="chosen && !creating" :title="chosen.title" @close="chosen = null">
      <button class="menu-item" @click="enqueue">
        <ListPlus />
        加入播放队列
      </button>
      <h3>添加到歌单</h3>
      <button v-for="list in music.lists" :key="list.id" class="menu-item" @click="addTo(list.id)">
        {{ list.name }}
      </button>
      <button class="menu-item" @click="creating = true">
        <Plus />
        新建歌单并添加
      </button>
      <button v-if="removable" class="menu-item danger" @click="remove">
        <Trash2 />
        从歌单移除
      </button>
    </Modal>
    <PlaylistForm v-if="creating" @close="creating = false" @saved="addTo" />
  </section>
</template>
