import { db, DEFAULT_SETTINGS, Settings, AppEvent } from './db'

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

export async function getEventsSince(ts: number) {
  return db.events.where('ts').aboveOrEqual(ts).toArray()
}

export async function getAllEvents() {
  return db.events.toArray()
}
