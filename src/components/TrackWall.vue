<script setup>
import { computed, inject, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Heart, MoreHorizontal, Pause, Play } from 'lucide-vue-next'
import { useMusic, usePlayer } from '../stores/music'
import CoverWall from './CoverWall.vue'
import CoverBackdrop from './CoverBackdrop.vue'
import TrackActions from './TrackActions.vue'
import SearchEmpty from './SearchEmpty.vue'

const props = defineProps({
  tracks: { type: Array, required: true },
  label: { type: String, required: true },
  removable: Boolean,
  showCount: Boolean,
  viewKey: { type: String, default: '' },
})
const emit = defineEmits(['remove'])
const search = inject('search')
const route = useRoute()
const music = useMusic()
const player = usePlayer()
const chosen = ref(null)
const preview = ref(null)
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
  if (player.id === song.id) player.toggle()
  else
    player.select(
      song.id,
      items.value.map((track) => track.id),
    )
}
</script>

<template>
  <section class="cover-room">
    <CoverBackdrop v-if="cover" :cover="cover" />
    <header class="cover-toolbar">
      <div class="cover-heading">
        <slot name="back" />
        <h1>{{ label }}</h1>
        <span v-if="showCount">{{ items.length }} 首</span>
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
        <SearchEmpty v-if="query">没有匹配的曲目</SearchEmpty>
        <div v-else class="cover-empty">
          <slot name="empty">暂无曲目</slot>
        </div>
      </template>
    </CoverWall>
    <TrackActions
      v-if="chosen"
      :song="chosen"
      :removable="removable"
      @close="chosen = null"
      @remove="emit('remove', $event)"
    />
  </section>
</template>
