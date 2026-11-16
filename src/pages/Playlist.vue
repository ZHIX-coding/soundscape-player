<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Play, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { songs } from '../data/songs'
import { useMusic, usePlayer } from '../stores/music'
import { time } from '../persistence'
import Modal from '../components/Modal.vue'
import PlaylistForm from '../components/PlaylistForm.vue'
import SongTable from '../components/SongTable.vue'
import PlaylistArtwork from '../components/PlaylistArtwork.vue'
import CoverBackdrop from '../components/CoverBackdrop.vue'
const route = useRoute(),
  router = useRouter(),
  m = useMusic(),
  p = usePlayer(),
  panel = ref(''),
  query = ref('')
const list = computed(() => m.lists.find((l) => l.id === route.params.id))
const all = computed(() => (list.value?.songIds || []).map((id) => songs.find((s) => s.id === id)))
const items = computed(() =>
  all.value.filter((s) =>
    (s.title + s.artist).toLowerCase().includes(query.value.trim().toLowerCase()),
  ),
)
function remove(id) {
  list.value.songIds = list.value.songIds.filter((x) => x !== id)
  m.notify('已从歌单移除')
}
function destroy() {
  m.lists = m.lists.filter((l) => l.id !== list.value.id)
  panel.value = ''
  router.replace('/my')
  m.notify('已删除歌单')
}
</script>
<template>
  <RouterLink class="back" to="/my">← 我的音乐</RouterLink>
  <template v-if="list">
    <div class="playlist-poster">
      <CoverBackdrop v-if="all.length" :cover="all[0].cover" />
      <div class="poster-art">
        <i aria-hidden="true" class="record-disc"></i>
        <PlaylistArtwork :tracks="all" />
      </div>
      <div class="poster-copy">
        <small>自建歌单 · {{ all.length }} 首曲目</small>
        <h1>{{ list.name }}</h1>
        <p v-if="list.description">{{ list.description }}</p>
        <p v-if="all.length">已知总时长 {{ time(all.reduce((n, s) => n + s.duration, 0)) }}</p>
        <button v-if="all.length" class="exhibit-play" @click="p.select(all[0].id, list.songIds)">
          <Play />
          播放全部
        </button>
        <button v-else class="exhibit-play" @click="panel = 'add'">
          <Plus />
          添加第一首歌
        </button>
      </div>
    </div>
    <div class="toolbar">
      <button class="pill" @click="panel = 'add'">
        <Plus />
        添加歌曲
      </button>
      <button class="pill" @click="panel = 'edit'">
        <Pencil />
        编辑
      </button>
      <button class="pill" @click="panel = 'delete'">
        <Trash2 />
        删除
      </button>
    </div>
    <input
      v-model="query"
      class="local-search"
      aria-label="搜索歌单"
      placeholder="搜索歌单内的歌曲"
    />
    <SongTable v-if="items.length" :items="items" removable @remove="remove" />
    <p v-else class="empty">
      {{ all.length ? '没有找到匹配曲目' : '这张歌单还是空的，可以添加第一首歌了。' }}
    </p>
    <PlaylistForm v-if="panel === 'edit'" :list="list" @close="panel = ''" />
    <Modal v-if="panel === 'add'" title="添加歌曲" @close="panel = ''">
      <button
        v-for="s in songs"
        :key="s.id"
        class="menu-item row"
        :disabled="list.songIds.includes(s.id)"
        @click="m.add(list.id, s.id)"
      >
        {{ s.title }}
        <small>{{ list.songIds.includes(s.id) ? '已添加' : '添加 +' }}</small>
      </button>
    </Modal>
    <Modal v-if="panel === 'delete'" title="删除这张歌单？" @close="panel = ''">
      <p>「{{ list.name }}」中的曲目仍可在曲库找到。</p>
      <div class="actions">
        <button class="pill" @click="panel = ''">取消</button>
        <button class="solid" @click="destroy">确认删除</button>
      </div>
    </Modal>
  </template>
  <p v-else class="empty">找不到这张歌单，可能已被删除。</p>
</template>
