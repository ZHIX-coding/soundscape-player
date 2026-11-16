<script setup>
import { ref, shallowRef } from 'vue'
import Modal from './Modal.vue'
import { importSong } from '../data/local'
import { usePlayer, useMusic } from '../stores/music'
const emit = defineEmits(['close', 'imported'])
const audio = ref(null),
  lrc = ref(null),
  image = ref(null),
  title = ref(''),
  artist = ref(''),
  busy = ref(false),
  error = ref('')
const p = usePlayer(),
  m = useMusic()
const embedded = shallowRef({})
const reading = ref(false)
async function choose(e) {
  audio.value = e.target.files[0]
  const file = audio.value
  embedded.value = {}
  reading.value = false
  if (!audio.value) return
  const pieces = audio.value.name.replace(/\.[^.]+$/, '').split(' - ')
  title.value = pieces.pop()
  artist.value = pieces.join(' - ')
  const initialTitle = title.value,
    initialArtist = artist.value
  reading.value = true
  try {
    const { readEmbedded } = await import('../data/embedded')
    const tags = await readEmbedded(file)
    if (audio.value !== file) return
    embedded.value = tags
    if (title.value === initialTitle && tags.title) title.value = tags.title
    if (artist.value === initialArtist && tags.artist) artist.value = tags.artist
  } catch {
    // Browser-playable audio can still be imported when its tags are unreadable.
  } finally {
    if (audio.value === file) reading.value = false
  }
}
async function submit() {
  if (busy.value || reading.value) return
  busy.value = true
  error.value = ''
  try {
    const song = await importSong({
      file: audio.value,
      embedded: embedded.value,
      image: image.value,
      lrc: lrc.value,
      title: title.value,
      artist: artist.value,
    })
    emit('imported')
    emit('close')
    m.notify('已导入「' + song.title + '」')
    await p.select(song.id)
  } catch (e) {
    error.value = e.message || '未能保存这首歌，请重试。'
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <Modal title="导入本地歌曲" @close="!busy && emit('close')">
    <form class="import-form" @submit.prevent="submit">
      <label>
        音频文件
        <input required type="file" accept="audio/*,.mp3,.m4a,.flac,.ogg,.wav" @change="choose" />
      </label>
      <label>
        歌名
        <input v-model="title" required maxlength="160" />
      </label>
      <label>
        歌手
        <input v-model="artist" placeholder="选填" />
      </label>
      <label>
        同步歌词（选填）
        <input type="file" accept=".lrc" @change="lrc = $event.target.files[0]" />
      </label>
      <label>
        封面（选填）
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          @change="image = $event.target.files[0]"
        />
      </label>
      <p class="import-hint" role="status">
        {{
          reading
            ? '正在读取音频信息…'
            : '只选音频即可。自动读取内置封面和歌词，也可以自行替换。歌曲保存在当前浏览器。'
        }}
      </p>
      <p v-if="error" role="alert">{{ error }}</p>
      <button class="solid" :disabled="busy || reading">
        {{ busy ? '正在导入…' : '导入并播放' }}
      </button>
    </form>
  </Modal>
</template>
