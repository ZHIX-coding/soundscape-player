<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, Pencil, Play, Plus, Trash2 } from 'lucide-vue-next'
import { songs } from '../data/songs'
import { useMusic, usePlayer } from '../stores/music'
import Modal from '../components/Modal.vue'
import PlaylistForm from '../components/PlaylistForm.vue'
import TrackWall from '../components/TrackWall.vue'

const route = useRoute()
const router = useRouter()
const music = useMusic()
const player = usePlayer()
const panel = ref('')
const pickerQuery = ref('')
const favorite = computed(() => route.params.id === 'favorites')
const list = computed(() => music.lists.find((item) => item.id === route.params.id))
const tracks = computed(() => {
  const byId = new Map(songs.map((song) => [song.id, song]))
  return (favorite.value ? music.favorites : (list.value?.songIds ?? []))
    .map((id) => byId.get(id))
    .filter(Boolean)
})
const available = computed(() =>
  songs.filter((song) =>
    [song.title, song.artist]
      .join(' ')
      .toLowerCase()
      .includes(pickerQuery.value.trim().toLowerCase()),
  ),
)
function closePicker() {
  panel.value = ''
  pickerQuery.value = ''
}
function remove(id) {
  list.value.songIds = list.value.songIds.filter((songId) => songId !== id)
  music.notify('已从歌单移除')
}
function destroy() {
  music.lists = music.lists.filter((item) => item.id !== list.value.id)
  router.replace('/my')
  music.notify('已删除歌单')
}
</script>

<template>
  <TrackWall
    v-if="list || favorite"
    show-count
    :label="favorite ? '我喜欢' : list.name"
    :tracks="tracks"
    :removable="!!list"
    @remove="remove"
  >
    <template #back>
      <RouterLink to="/my" class="icon" aria-label="返回歌单"><ChevronLeft /></RouterLink>
    </template>
    <template #actions>
      <button
        v-if="tracks.length"
        class="pill"
        aria-label="播放全部"
        @click="
          player.select(
            tracks[0].id,
            tracks.map((song) => song.id),
          )
        "
      >
        <Play />
        <span>播放全部</span>
      </button>
      <button v-if="list" class="pill" aria-label="添加歌曲" @click="panel = 'add'">
        <Plus />
        <span>添加歌曲</span>
      </button>
      <button
        v-if="list"
        class="icon"
        aria-label="编辑歌单"
        title="编辑歌单"
        @click="panel = 'edit'"
      >
        <Pencil />
      </button>
      <button
        v-if="list"
        class="icon"
        aria-label="删除歌单"
        title="删除歌单"
        @click="panel = 'delete'"
      >
        <Trash2 />
      </button>
    </template>
  </TrackWall>
  <div v-else class="library-empty">
    <p>找不到这张歌单</p>
    <RouterLink class="pill" to="/my">返回歌单</RouterLink>
  </div>
  <PlaylistForm v-if="panel === 'edit' && list" :list="list" @close="panel = ''" />
  <Modal v-if="panel === 'add' && list" title="添加歌曲" @close="closePicker">
    <input
      v-model="pickerQuery"
      type="search"
      placeholder="搜索曲目"
      aria-label="搜索要添加的歌曲"
    />
    <button
      v-for="song in available"
      :key="song.id"
      class="menu-item row"
      :disabled="list.songIds.includes(song.id)"
      @click="music.add(list.id, song.id)"
    >
      {{ song.title }}
      <small>{{ list.songIds.includes(song.id) ? '已添加' : song.artist }}</small>
    </button>
  </Modal>
  <Modal v-if="panel === 'delete' && list" title="删除歌单？" @close="panel = ''">
    <div class="actions">
      <button class="pill" @click="panel = ''">取消</button>
      <button class="solid" @click="destroy">确认删除</button>
    </div>
  </Modal>
</template>
