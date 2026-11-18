import { ref } from 'vue'
import { songs } from './songs'
import { parseLrc } from './lrc'
import { read, save } from '../persistence'

export const catalogNotice = ref('')

function mediaUrl(value, base) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value.trim(), base)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function tracksFrom(payload, base) {
  if (!Array.isArray(payload?.songs)) throw new Error('曲库数据格式无效')
  const tracks = []
  const seen = new Set()
  for (const row of payload.songs) {
    const key =
      typeof row?.id === 'string'
        ? row.id.trim()
        : Number.isSafeInteger(row?.id)
          ? String(row.id)
          : ''
    const title = typeof row?.title === 'string' ? row.title.trim() : ''
    const audio = mediaUrl(row?.audio, base)
    if (!key || !title || !audio || seen.has(key)) continue
    seen.add(key)
    tracks.push({
      id: 'remote:' + key,
      title,
      english: (typeof row.english === 'string' && row.english.trim()) || title,
      artist: (typeof row.artist === 'string' && row.artist.trim()) || '未知艺术家',
      genre: (typeof row.genre === 'string' && row.genre.trim()) || '未分类',
      duration: Number.isFinite(row.duration) && row.duration > 0 ? row.duration : 0,
      audio,
      cover: mediaUrl(row.cover, base) || import.meta.env.BASE_URL + 'media/afterglow.webp',
      vocal: row.vocal !== false,
      lyrics: typeof row.lrc === 'string' ? parseLrc(row.lrc) : [],
    })
  }
  if (payload.songs.length && !tracks.length) throw new Error('曲库没有有效记录')
  return tracks
}

export async function loadRemoteCatalog(endpoint) {
  if (!endpoint) return
  const cacheKey = 'catalog.' + endpoint
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4500)
  try {
    const response = await fetch(endpoint, { signal: controller.signal })
    if (!response.ok) throw new Error('曲库请求失败')
    const payload = await response.json()
    const tracks = tracksFrom(payload, response.url)
    songs.unshift(...tracks)
    save(cacheKey, { base: response.url, payload })
    if (tracks.length < payload.songs.length)
      catalogNotice.value = '已跳过重复或缺少必要信息的在线曲目。'
  } catch {
    catalogNotice.value = '在线曲库暂时无法读取。你可以导入本地歌曲。'
    try {
      const cached = read(cacheKey, null)
      if (cached) {
        songs.unshift(...tracksFrom(cached.payload, cached.base))
        catalogNotice.value = '正在显示上次载入的在线曲库，播放在线音频仍需网络。'
      }
    } catch {
      /* Local imports remain available when the cache is unreadable. */
    }
  } finally {
    clearTimeout(timer)
  }
}
