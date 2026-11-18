export function browseOrigin(path) {
  return typeof path === 'string' &&
    /^\/(library|local|my|artists(?:\/[^?#]+)?|queue|playlist\/[^/?#]+)$/.test(path)
    ? path
    : '/library'
}
