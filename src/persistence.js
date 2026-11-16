export function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem('soundscape.v1.' + key)) ?? fallback
  } catch {
    return fallback
  }
}
export function save(key, value) {
  try {
    localStorage.setItem('soundscape.v1.' + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
export const isRecord = (v) => v && typeof v === 'object' && !Array.isArray(v)
export function time(seconds) {
  const n = Math.max(0, Math.floor(Number(seconds) || 0))
  return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0')
}
