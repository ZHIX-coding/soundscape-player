import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { songs } from '../data/songs'
import { read, save, isRecord } from '../persistence'
const catalog = computed(() => new Map(songs.map((s) => [s.id, s])))
function validIds(value) {
  return Array.isArray(value) ? [...new Set(value.filter((id) => catalog.value.has(id)))] : []
}
export const useMusic = defineStore('music', () => {
  const state = read('collection', {})
  const favorites = ref(validIds(state?.favorites))
  const lists = ref(
    (Array.isArray(state?.lists) ? state.lists : [])
      .filter((p) => isRecord(p) && typeof p.id === 'string' && typeof p.name === 'string')
      .map((p) => ({
        ...p,
        songIds: validIds(p.songIds),
        description: typeof p.description === 'string' ? p.description : '',
      })),
  )
  const message = ref('')
  let timeout
  function notify(text) {
    message.value = text
    clearTimeout(timeout)
    timeout = setTimeout(() => (message.value = ''), 3200)
  }
  watch(
    [favorites, lists],
    () => {
      if (!save('collection', { favorites: favorites.value, lists: lists.value }))
        notify('浏览器存储不可用，本次更改仅在当前页面保留')
    },
    { deep: true, flush: 'sync' },
  )
  function favorite(id) {
    favorites.value = favorites.value.includes(id)
      ? favorites.value.filter((x) => x !== id)
      : [...favorites.value, id]
  }
  function putList(id, name, description) {
    name = name.trim()
    if (!name) return '请输入歌单名称'
    if (name.length > 24) return '歌单名称最多 24 个字符'
    if (lists.value.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase()))
      return '已有同名歌单，请换一个名称'
    const list = lists.value.find((p) => p.id === id)
    if (list) Object.assign(list, { name, description: description.trim() })
    else
      lists.value.push({
        id: crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2),
        name,
        description: description.trim(),
        songIds: [],
      })
    notify(list ? '已保存歌单' : '已创建歌单')
    return ''
  }
  function add(id, songId) {
    const p = lists.value.find((x) => x.id === id)
    if (!p) return
    if (p.songIds.includes(songId)) {
      notify('这首歌已在歌单中')
      return
    }
    p.songIds.push(songId)
    notify('已加入「' + p.name + '」')
  }
  return { favorites, lists, message, notify, favorite, putList, add }
})
export const usePlayer = defineStore('player', () => {
  const music = useMusic()
  const old = read('player', {})
  const queue = ref(validIds(old?.queue))
  const savedEmptyQueue = Array.isArray(old?.queue) && old.queue.length === 0
  if (!queue.value.length && !savedEmptyQueue) queue.value = songs.map((s) => s.id)
  const id = ref(queue.value.includes(old?.id) ? old.id : queue.value[0])
  const song = computed(() => catalog.value.get(id.value))
  const audio = new Audio()
  audio.preload = 'metadata'
  const playing = ref(false),
    position = ref(id.value && old?.id === id.value ? Math.max(0, Number(old?.position) || 0) : 0),
    duration = ref(song.value?.duration ?? 0)
  const volume = ref(Math.min(1, Math.max(0, Number.isFinite(old?.volume) ? old.volume : 0.7)))
  const modes = ['顺序播放', '随机播放', '单曲循环']
  const mode = ref(modes.includes(old?.mode) ? old.mode : modes[0])
  const seekVersion = ref(0)
  function persist() {
    save('player', {
      queue: queue.value,
      id: id.value,
      volume: volume.value,
      mode: mode.value,
      position: position.value,
    })
  }
  let resumeAt = position.value,
    lastSecond = -1,
    mediaRevision = 0
  function load() {
    if (!song.value) return
    mediaRevision++
    audio.src = song.value.audio
    duration.value = song.value.duration
    audio.load()
  }
  audio.onloadedmetadata = () => {
    if (!song.value || audio.readyState < HTMLMediaElement.HAVE_METADATA) return
    duration.value = audio.duration
    if (Number.isFinite(duration.value)) audio.currentTime = Math.min(resumeAt, duration.value)
    resumeAt = 0
  }
  audio.ontimeupdate = () => {
    if (!song.value || audio.readyState < HTMLMediaElement.HAVE_METADATA) return
    position.value = audio.currentTime
    const n = Math.floor(position.value)
    if (n !== lastSecond) {
      lastSecond = n
      persist()
    }
  }
  audio.onplaying = () => {
    if (song.value && !audio.paused && audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
      playing.value = true
  }
  audio.onpause = () => {
    if (!audio.paused) return
    playing.value = false
    persist()
  }
  audio.onerror = () => {
    if (!song.value || !audio.error) return
    playing.value = false
    music.notify('无法读取这首歌的音频，请重试或切换曲目')
  }
  async function play() {
    if (!song.value) return
    if (audio.error) load()
    const revision = mediaRevision
    try {
      await audio.play()
    } catch (e) {
      if (revision === mediaRevision && e.name !== 'AbortError')
        music.notify('播放未成功，请再点一次播放或切歌')
    }
  }
  function select(next, ids) {
    if (!catalog.value.has(next)) return
    if (ids?.length) queue.value = validIds(ids)
    if (!queue.value.includes(next)) queue.value.push(next)
    if (id.value !== next) {
      id.value = next
      resumeAt = 0
      position.value = 0
      load()
    }
    persist()
    return play()
  }
  function toggle() {
    if (audio.error || audio.paused) play()
    else audio.pause()
  }
  function step(delta, ended = false) {
    const q = queue.value,
      idx = q.indexOf(id.value)
    if (!q.length) return
    if (ended && mode.value === '单曲循环') {
      audio.currentTime = 0
      return play()
    }
    if (ended && mode.value === '顺序播放' && idx === q.length - 1) {
      playing.value = false
      seek(0)
      return
    }
    const offset =
      mode.value === '随机播放' && q.length > 1
        ? 1 + Math.floor(Math.random() * (q.length - 1))
        : delta
    const next = q[(idx + offset + q.length) % q.length]
    if (next === id.value) seek(0)
    return select(next)
  }
  audio.onended = () => {
    if (song.value && audio.ended) step(1, true)
  }
  function seek(v) {
    seekVersion.value++
    const value = Math.min(duration.value, Math.max(0, Number(v) || 0))
    position.value = value
    if (audio.readyState) audio.currentTime = value
    else resumeAt = value
    persist()
  }
  function clearQueue() {
    mediaRevision++
    queue.value = []
    id.value = undefined
    playing.value = false
    position.value = 0
    duration.value = 0
    resumeAt = 0
    lastSecond = -1
    seekVersion.value++
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    persist()
  }
  function enqueue(key) {
    if (queue.value.includes(key)) {
      music.notify('这首歌已在队列中')
      return
    }
    queue.value.push(key)
    music.notify('已加入播放队列')
    persist()
  }
  function remove(key) {
    if (key === id.value) {
      music.notify('请先切换当前曲目')
      return
    }
    queue.value = queue.value.filter((x) => x !== key)
    persist()
  }
  function move(key, delta) {
    const ids = [...queue.value],
      index = ids.indexOf(key),
      next = index + delta
    if (index < 0 || next < 0 || next >= ids.length) return
    ids.splice(index, 1)
    ids.splice(next, 0, key)
    queue.value = ids
    persist()
  }
  watch(
    volume,
    (v) => {
      audio.volume = v
      persist()
    },
    { flush: 'sync' },
  )
  watch(mode, persist)
  audio.volume = volume.value
  load()
  return {
    queue,
    mediaTime: () => (audio.readyState ? audio.currentTime : position.value),
    id,
    song,
    playing,
    position,
    duration,
    volume,
    mode,
    modes,
    seekVersion,
    select,
    toggle,
    step,
    seek,
    clearQueue,
    enqueue,
    remove,
    move,
  }
})
