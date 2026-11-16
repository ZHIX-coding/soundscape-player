<script setup>
import { ref } from 'vue'
import { Play, Pause, Heart, MoreHorizontal, Plus, ListPlus, Trash2 } from 'lucide-vue-next'
import { usePlayer, useMusic } from '../stores/music'
import { time } from '../persistence'
import Modal from './Modal.vue'
import PlaylistForm from './PlaylistForm.vue'
defineProps({ items: { type: Array, required: true }, removable: Boolean })
const emit = defineEmits(['remove'])
const p = usePlayer(),
  m = useMusic(),
  chosen = ref(null),
  create = ref(false)
function addTo(id) {
  m.add(id, chosen.value.id)
  chosen.value = null
}
</script>
<template>
  <div class="song-table">
    <div class="song-row headings">
      <span>#</span>
      <span>曲目 / 艺术家</span>
      <span class="genre">风格</span>
      <span>时长</span>
      <span></span>
    </div>
    <div v-for="(s, i) in items" :key="s.id" class="song-row" :class="{ current: p.id === s.id }">
      <button
        class="row-play"
        :aria-label="'播放 ' + s.title"
        @click="
          p.id === s.id
            ? p.toggle()
            : p.select(
                s.id,
                items.map((x) => x.id),
              )
        "
      >
        <Pause v-if="p.playing && p.id === s.id" :size="15" />
        <Play v-else-if="p.id === s.id" :size="15" />
        <span v-else>{{ String(i + 1).padStart(2, '0') }}</span>
      </button>
      <button
        class="track"
        @click="
          p.select(
            s.id,
            items.map((x) => x.id),
          )
        "
      >
        <img :src="s.cover" alt="" />
        <span>
          <b>{{ s.title }}</b>
          <small>{{ s.artist }}</small>
        </span>
      </button>
      <span class="genre">{{ s.genre }}</span>
      <span class="mono">{{ s.duration ? time(s.duration) : '—' }}</span>
      <div class="actions">
        <button
          class="icon"
          :class="{ liked: m.favorites.includes(s.id) }"
          :aria-label="'收藏 ' + s.title"
          :aria-pressed="m.favorites.includes(s.id)"
          @click="m.favorite(s.id)"
        >
          <Heart />
        </button>
        <button class="icon" :aria-label="s.title + ' 更多操作'" @click="chosen = s">
          <MoreHorizontal />
        </button>
      </div>
    </div>
  </div>
  <Modal v-if="chosen && !create" :title="chosen.title" @close="chosen = null">
    <button
      class="menu-item"
      @click="
        () => {
          p.enqueue(chosen.id)
          chosen = null
        }
      "
    >
      <ListPlus />
      加入播放队列
    </button>
    <h3>添加到歌单</h3>
    <button v-for="list in m.lists" :key="list.id" class="menu-item" @click="addTo(list.id)">
      {{ list.name }}
    </button>
    <button class="menu-item" @click="create = true">
      <Plus />
      新建歌单并添加
    </button>
    <button
      v-if="removable"
      class="menu-item danger"
      @click="
        () => {
          emit('remove', chosen.id)
          chosen = null
        }
      "
    >
      <Trash2 />
      从歌单移除
    </button>
  </Modal>
  <PlaylistForm v-if="create" @close="create = false" @saved="addTo" />
</template>
