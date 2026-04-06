export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function formatTime(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const remSec = sec % 60
  const centis = Math.floor((ms % 1000) / 10)

  return `${String(min).padStart(2, '0')}:${String(remSec).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
}
