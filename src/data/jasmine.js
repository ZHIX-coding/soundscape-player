// Approximate syllable onsets aligned to Lindy Lin's field recording, in seconds.
const phrases = [
  ['好一朵美丽的茉莉花', [0.08, 1.64, 2.1, 2.44, 3.24, 3.64, 4, 4.74, 5.5], 6.24],
  ['好一朵美丽的茉莉花', [6.84, 7.54, 7.96, 8.34, 9.14, 9.52, 9.9, 10.66, 11.4], 12.18],
  ['芬芳美丽满枝桠', [12.82, 13.6, 14.32, 15.1, 15.82, 16.6, 17.32], 18.14],
  ['又白又香人人夸', [18.74, 19.5, 20.2, 20.92, 21.72, 22.4, 23.16], 23.91],
  ['让我来将你摘下', [24.62, 25.38, 26.14, 27.22, 27.64, 28.32, 29.06], 30.13],
  ['送给别人家', [30.44, 31.18, 31.92, 32.64, 33.36], 34.29],
  ['茉莉花呀茉莉花', [34.86, 35.64, 36.34, 37.52, 37.92, 38.68, 39.4], 40.01],
  ['茉莉花呀茉莉花', [40.94, 41.72, 42.42, 43.64, 44.06, 45.02, 45.92], 46.98],
]

export const jasmine = {
  id: 'jasmine',
  title: '茉莉花',
  english: 'Jasmine Flower',
  artist: 'Lindy Lin',
  genre: '中文民歌',
  vocal: true,
  duration: 48.573,
  cover: 'jasmine.webp',
  audio: 'jasmine.mp3',
  lyrics: phrases.map(([text, times, end]) => ({
    text,
    start: times[0],
    end,
    words: Array.from(text, (char, i) => ({
      text: char,
      start: times[i],
      end: times[i + 1] ?? end,
    })),
  })),
}
