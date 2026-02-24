export function msToHHMM(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  const hh = Math.floor(totalMin / 60) % 24
  const mm = totalMin % 60
  return `${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`
}

export function hhmmToMs(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h * 60 + m) * 60000
}

export function daysBetween(a: number, b: number): number {
  const ms = Math.abs(b - a)
  return Math.floor(ms / (24*60*60*1000))
}
