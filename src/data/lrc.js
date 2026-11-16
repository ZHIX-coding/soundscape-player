function seconds(minutes, seconds, fraction = '') {
  return Number(minutes) * 60 + Number(seconds) + Number('0.' + fraction)
}

// Enhanced LRC uses absolute <mm:ss.xx> timestamps before each word.
// A time tag without text at the end of a line marks the release of its last word.
function timedWords(content, shift, lineStart) {
  const markers = [...content.matchAll(/<(\d+):([0-5]\d)(?:[.:](\d{1,3}))?>/g)]
  if (!markers.length || content.slice(0, markers[0].index).trim()) return {}
  const words = []
  let previous = -Infinity
  let end
  for (const [i, marker] of markers.entries()) {
    const start = Math.max(0, seconds(marker[1], marker[2], marker[3]) + shift)
    if (start < lineStart || start <= previous) return {}
    previous = start
    const text = content.slice(marker.index + marker[0].length, markers[i + 1]?.index)
    if (words.length) words.at(-1).end = start
    if (text) words.push({ start, text })
    else if (i === markers.length - 1) end = start
    else return {}
  }
  return words.length ? { words, end } : {}
}

export function parseLrc(raw) {
  const stamp = /\[(\d+):([0-5]\d)(?:[.:](\d{1,3}))?\]/g
  const offset = Number(raw.match(/\[offset:\s*([+-]?\d+)\]/i)?.[1] || 0) / 1000
  const lyrics = []
  for (const row of raw.split(/\r?\n/)) {
    const stamps = [...row.matchAll(stamp)]
    if (!stamps.length) continue
    const content = row.replace(stamp, '').trim()
    const text = content.replace(/<\d+:[0-5]\d(?:[.:]\d{1,3})?>/g, '').trim()
    if (!text) continue
    const base = seconds(...stamps[0].slice(1))
    for (const marker of stamps) {
      const at = seconds(...marker.slice(1))
      const start = Math.max(0, at - offset)
      lyrics.push({ text, start, ...timedWords(content, at - base - offset, start) })
    }
  }
  lyrics.sort((a, b) => a.start - b.start)
  return lyrics
}
export async function readLyrics(file) {
  const bytes = await file.arrayBuffer()
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    text = new TextDecoder('gb18030').decode(bytes)
  }
  const lyrics = parseLrc(text)
  if (!lyrics.length) throw new Error('歌词里没有找到时间标签，例如 [00:12.30]。')
  return lyrics
}
