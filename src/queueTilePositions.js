const shapes = [
  [1, 1],
  [2, 1],
  [1, 1],
  [1, 2],
  [1, 1],
  [2, 2],
  [1, 1],
  [2, 1],
  [1, 1],
]

export function queueTilePositions(tracks, currentId, columns, visibleRows) {
  const occupied = []
  let cursor = 0
  let currentRow = 0
  const canFit = (row, col, width, height) => {
    if (col + width > columns) return false
    for (let y = row; y < row + height; y++)
      for (let x = col; x < col + width; x++) if (occupied[y]?.[x]) return false
    return true
  }

  const positions = tracks.map((track, index) => {
    const current = track.id === currentId
    let [width, height] = shapes[index % shapes.length]
    let row = Math.floor(cursor / columns)
    let col = cursor % columns
    if (current) {
      width = columns === 3 ? 3 : 4
      height = 3
      const center = (columns - width) / 2
      if (col > center) row++
      col = center
      while (!canFit(row, col, width, height)) row++
      currentRow = row
    } else {
      while (occupied[row]?.[col]) {
        cursor++
        row = Math.floor(cursor / columns)
        col = cursor % columns
      }
      if (columns <= 6 && height === 2 && width === 2) height = 1
      if (columns === 3) height = 1
      if (!canFit(row, col, width, height)) {
        if (canFit(row, col, width, 1)) height = 1
        else if (canFit(row, col, 1, height)) width = 1
        else width = height = 1
      }
    }
    for (let y = row; y < row + height; y++) {
      occupied[y] ??= []
      for (let x = col; x < col + width; x++) occupied[y][x] = true
    }
    cursor = row * columns + col + width
    return { gridColumn: `${col + 1} / span ${width}`, gridRow: `${row + 1} / span ${height}` }
  })
  const repeats = []
  if (!tracks.length) return { positions, repeats }

  // Scan complete rows nearest to the feature first, then the two ends.
  const center = currentRow + 1
  const last = occupied.length - 1
  const buffer = Math.ceil(visibleRows / 2) + 1
  const firstRow = -buffer
  const lastRow = last + buffer
  const radius = Math.ceil(visibleRows / 2) + 1
  const rows = new Set()
  for (let distance = 0; distance <= radius; distance++) {
    if (center - distance >= firstRow) rows.add(center - distance)
    if (center + distance <= lastRow) rows.add(center + distance)
  }
  for (let row = firstRow; row <= 0; row++) rows.add(row)
  for (let row = last; row <= lastRow; row++) rows.add(row)

  const holes = []
  const limit = columns === 8 ? 40 : 32
  for (const row of rows) {
    for (let col = 0; col < columns && holes.length < limit; col++) {
      if (!occupied[row]?.[col]) holes.push({ row, col })
    }
    if (holes.length === limit) break
  }
  holes.sort((a, b) => a.row - b.row || a.col - b.col)
  const current = Math.max(
    0,
    tracks.findIndex((track) => track.id === currentId),
  )
  for (const [index, { row, col }] of holes.entries()) {
    const track = tracks[(current + index + 1) % tracks.length]
    repeats.push({ row, col, cover: track.cover })
  }
  return { positions, repeats }
}
