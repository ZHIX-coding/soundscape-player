import { songs } from './songs'
import { readLyrics } from './lrc'
let opened
function database() {
  if (!opened)
    opened = new Promise((resolve, reject) => {
      const request = indexedDB.open('soundscape-media', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('tracks', { keyPath: 'id' })
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }).catch((error) => {
      opened = undefined
      throw error
    })
  return opened
}
function materialize(record) {
  const { file, image, ...meta } = record
  return {
    ...meta,
    audio: URL.createObjectURL(file),
    cover: image ? URL.createObjectURL(image) : import.meta.env.BASE_URL + 'media/afterglow.webp',
  }
}
export async function restoreImports() {
  const db = await database()
  const records = await new Promise((resolve, reject) => {
    const req = db.transaction('tracks').objectStore('tracks').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  for (const record of records)
    if (record.file instanceof Blob && !songs.some((s) => s.id === record.id))
      songs.push(materialize(record))
}
async function audioDuration(file) {
  const audio = new Audio(),
    url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const fail = () =>
        reject(new Error('浏览器无法读取这份音频，请选择可播放的 MP3、M4A、WAV 或 OGG 文件。'))
      const timer = setTimeout(fail, 12000)
      audio.onloadedmetadata = () => {
        clearTimeout(timer)
        if (Number.isFinite(audio.duration) && audio.duration > 0) resolve(audio.duration)
        else fail()
      }
      audio.onerror = () => {
        clearTimeout(timer)
        fail()
      }
      audio.preload = 'metadata'
      audio.src = url
    })
  } finally {
    audio.onloadedmetadata = null
    audio.onerror = null
    audio.removeAttribute('src')
    audio.load()
    URL.revokeObjectURL(url)
  }
}
export async function importSong({ file, image, lrc, title, artist, embedded = {} }) {
  if (!file || !title.trim()) throw new Error('请选择音频并填写歌名。')
  const duration = await audioDuration(file)
  const lyrics = lrc
    ? await readLyrics(lrc)
    : (embedded.lyrics ?? []).filter((line) => line.start < duration)
  if (lyrics.length && lyrics[0].start >= duration)
    throw new Error('歌词的首句超过歌曲时长，请检查是否选对 LRC。')
  if (image) {
    const bitmap = await createImageBitmap(image).catch(() => {
      throw new Error('封面无法读取，请选择 JPG、PNG 或 WebP。')
    })
    bitmap.close()
  }
  const record = {
    id:
      'local-' +
      (crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)),
    title: title.trim(),
    english: title.trim(),
    artist: artist.trim() || '未知艺术家',
    genre: '本地音乐',
    vocal: true,
    duration,
    lyrics,
    file,
    image: image || embedded.image,
    plainLyrics: lyrics.length ? '' : embedded.plainLyrics,
  }
  const db = await database()
  await new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite')
    tx.objectStore('tracks').add(record)
    tx.oncomplete = resolve
    tx.onabort = () => reject(new Error('本地空间不足或浏览器禁止保存，请检查存储设置。'))
  })
  const song = materialize(record)
  songs.unshift(song)
  return song
}
