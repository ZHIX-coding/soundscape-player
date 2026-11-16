import { parseBlob, selectCover } from 'music-metadata'
import { parseLrc } from './lrc'

export async function readEmbedded(file) {
  const { common } = await parseBlob(file)
  const picture = selectCover(common.picture)
  let image
  if (picture) {
    const blob = new Blob([picture.data], { type: picture.format })
    const bitmap = await createImageBitmap(blob).catch(() => null)
    if (bitmap) {
      bitmap.close()
      image = blob
    }
  }
  let plainLyrics = ''
  let lyrics = []
  for (const tag of common.lyrics ?? []) {
    plainLyrics ||= tag.text?.trim() || ''
    lyrics = parseLrc(tag.text ?? '')
    if (!lyrics.length && tag.timeStampFormat === 2) {
      lyrics = tag.syncText
        .filter(
          (line) => line.text?.trim() && Number.isFinite(line.timestamp) && line.timestamp >= 0,
        )
        .map((line) => ({ start: line.timestamp / 1000, text: line.text.trim() }))
        .sort((a, b) => a.start - b.start)
    }
    if (lyrics.length) break
  }
  return { title: common.title, artist: common.artist, image, lyrics, plainLyrics }
}
