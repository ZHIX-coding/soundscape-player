<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, ListPlus, Plus, Trash2 } from 'lucide-vue-next'
import { useMusic, usePlayer } from '../stores/music'
import Modal from './Modal.vue'
import PlaylistForm from './PlaylistForm.vue'

const props = defineProps({ song: { type: Object, required: true }, removable: Boolean })
const emit = defineEmits(['close', 'remove'])
const music = useMusic()
const player = usePlayer()
const creating = ref(false)
let trigger
onMounted(() => {
  trigger = document.activeElement
})
onBeforeUnmount(() => trigger?.focus({ preventScroll: true }))

function addTo(id) {
  music.add(id, props.song.id)
  emit('close')
}
function enqueue() {
  player.enqueue(props.song.id)
  emit('close')
}
function remove() {
  emit('remove', props.song.id)
  emit('close')
}
</script>

<template>
  <Modal v-if="!creating" :title="song.title" @close="emit('close')">
    <button class="menu-item" :disabled="player.queue.includes(song.id)" @click="enqueue">
      <Check v-if="player.queue.includes(song.id)" />
      <ListPlus v-else />
      {{ player.queue.includes(song.id) ? '已在播放队列' : '加入播放队列' }}
    </button>
    <h3>添加到歌单</h3>
    <button
      v-for="list in music.lists"
      :key="list.id"
      class="menu-item row"
      :disabled="list.songIds.includes(song.id)"
      @click="addTo(list.id)"
    >
      {{ list.name }}
      <small v-if="list.songIds.includes(song.id)">已添加</small>
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
  <PlaylistForm v-else @close="creating = false" @saved="addTo" />
</template>
