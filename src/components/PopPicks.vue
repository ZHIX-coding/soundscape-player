<script setup>
import { ref } from 'vue'
import { ExternalLink, Headphones } from 'lucide-vue-next'
import Modal from './Modal.vue'
import { usePlayer } from '../stores/music'

defineEmits(['close'])
const player = usePlayer()
const picks = [
  { id: '535824738', album: '535824731', title: '晴天', artist: '周杰伦' },
  { id: '1017697311', album: '1017697307', title: '小幸运', artist: '田馥甄' },
  { id: '1544722556', album: '1544722550', title: '唯一', artist: '告五人' },
  { id: '672994663', album: '672994651', title: 'Letting Go', artist: '蔡健雅' },
  { id: '1190070744', album: '1190070714', title: '光年之外', artist: '邓紫棋' },
  { id: '1596944703', album: '1596944315', title: '孤勇者', artist: '陈奕迅' },
]
const selected = ref(null)
function listen(song) {
  if (player.playing) player.toggle()
  selected.value = song
}
</script>
<template>
  <Modal title="华语流行精选" @close="$emit('close')">
    <p class="pop-caption">选一首，用 Apple Music 在线试听。</p>
    <div class="pop-options">
      <button
        v-for="song in picks"
        :key="song.id"
        class="menu-item"
        :aria-pressed="song.id === selected?.id"
        @click="listen(song)"
      >
        <b>{{ song.title }}</b>
        <small>{{ song.artist }}</small>
        <Headphones />
      </button>
    </div>
    <div v-if="selected" class="pop-player">
      <iframe
        :key="selected.id"
        :src="'https://embed.music.apple.com/cn/album/_/' + selected.album + '?i=' + selected.id"
        :title="selected.artist + '《' + selected.title + '》官方播放器'"
        allow="autoplay *; encrypted-media *; fullscreen *"
      />
      <a
        :href="'https://music.apple.com/cn/song/' + selected.id"
        target="_blank"
        rel="noopener noreferrer"
      >
        在 Apple Music 打开《{{ selected.title }}》
        <ExternalLink />
      </a>
    </div>
  </Modal>
</template>
<style scoped>
.pop-caption {
  color: var(--muted);
  font-size: 13px;
}
.pop-options {
  display: grid;
  gap: 2px;
}
.pop-options button {
  min-height: 39px;
  border-bottom: 1px solid var(--line);
}
.pop-options button[aria-pressed='true'] {
  background: #35333b;
  color: #e9dcff;
}
.pop-options small {
  margin-left: auto;
}
.pop-options svg,
.pop-player svg {
  width: 15px;
  height: 15px;
}
.pop-player {
  margin-top: 15px;
}
.pop-player iframe {
  border: 0;
  width: 100%;
  height: 175px;
  border-radius: 10px;
  background: #19181c;
}
.pop-player a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--accent);
  margin-top: 8px;
}
</style>
