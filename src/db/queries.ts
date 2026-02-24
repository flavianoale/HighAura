import { db, DEFAULT_SETTINGS, Settings, AppEvent, Photo } from './db'

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('singleton')
  if (!s) {
    await db.settings.put(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
  return s
}

export async function updateSettings(patch: Partial<Settings>) {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch })
}

export async function addEvent(type: AppEvent['type'], data?: any) {
  await db.events.add({ ts: Date.now(), type, data })
}

export async function getAllEvents() {
  return db.events.toArray()
}

export async function addPhoto(kind: Photo['kind'], blob: Blob) {
  await db.photos.add({ ts: Date.now(), kind, blob })
  await addEvent('photo_added', { kind })
}

export async function getLatestPhotos() {
  const all = await db.photos.orderBy('ts').reverse().toArray()
  const latest: Record<string, Photo | undefined> = { front: undefined, side: undefined, back: undefined }
  for (const p of all) {
    if (!latest[p.kind]) latest[p.kind] = p
    if (latest.front && latest.side && latest.back) break
  }
  return latest as { front?: Photo; side?: Photo; back?: Photo }
}

export async function getPhotosTimeline(kind: Photo['kind'], limit = 12) {
  return db.photos.where('kind').equals(kind).reverse().limit(limit).toArray()
}
