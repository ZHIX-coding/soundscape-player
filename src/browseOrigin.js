export function browseOrigin(path) {
  return typeof path === 'string' &&
    /^\/(library|local|my|artists(?:\/[^?#]+)?|queue|playlist\/[^/?#]+)$/.test(path)
    ? path
    : '/library'
}

function libraryOrigin(path) {
  const origin = browseOrigin(path)
  return origin === '/queue' ? '/library' : origin
}

export function queueLocation(from, origin) {
  return {
    path: '/queue',
    query:
      from === 'player' ? { from, origin: libraryOrigin(origin) } : { from: libraryOrigin(from) },
  }
}

export function playerFromQueue(query) {
  const { query: entry } = queueLocation(query.from, query.origin)
  return {
    path: '/player',
    query: { from: '/queue', queueFrom: entry.from, queueOrigin: entry.origin },
  }
}

export function queueFromPlayer(query) {
  return query.from === '/queue'
    ? queueLocation(query.queueFrom, query.queueOrigin)
    : queueLocation('player', query.from)
}
