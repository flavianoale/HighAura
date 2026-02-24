import Dexie, { Table } from 'dexie'

export type EventType =
  | 'app_opened'
  | 'block_started'
  | 'timer_completed'
  | 'task_toggled'
  | 'block_completed'
  | 'block_failed'
  | 'critical_violation'
  | 'mood_logged'
  | 'sleep_logged'
  | 'weight_logged'
  | 'photo_added'
  | 'interrupt_cycle'
  | 'pur90_started'
  | 'strict_mode_changed'
  | 'contract_signed'
  | 'contract_renewed'
  | 'audit_submitted'
  | 'social_logged'

export interface AppEvent {
  id?: number
  ts: number
  type: EventType
  data?: any
}

export interface Settings {
  id: 'singleton'
  wakeMs: number
  lunchMs: number
  sleepMs: number

  dailyStudyMin: number
  dailyPrayerMin: number

  honor: number
  strictMode: boolean
  strictPinHash: string
  crisisContainmentHours: number
  criticalPenalty: number

  audioEnabled: boolean
  audioArmed: boolean

  contractSignedAt?: number
  contractName: string
  contractVersion: number
  contractRenewEveryDays: number

  weeklySocialMin: number
  trackWomenSeparate: boolean

  npcStyle: 'mentor'
  theme: 'forge'

  day0: number

  startWeightKg: number
  targetWeightKg: number

  kcal: number
  proteinG: number
  fatG: number
  carbsG: number
}

export interface AudioAsset {
  id: 'main'
  mime: string
  blob: Blob
  updatedAt: number
}

export interface Photo {
  id?: number
  ts: number
  kind: 'front'|'side'|'back'
  blob: Blob
}

export class HighAuraDB extends Dexie {
  events!: Table<AppEvent, number>
  settings!: Table<Settings, string>
  audio!: Table<AudioAsset, string>
  photos!: Table<Photo, number>

  constructor() {
    super('highAura')
    this.version(2).stores({
      events: '++id, ts, type',
      settings: 'id',
      audio: 'id',
      photos: '++id, ts, kind'
    })
  }
}

export const db = new HighAuraDB()

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  wakeMs: 4 * 60 * 60 * 1000,
  lunchMs: 13 * 60 * 60 * 1000 + 30 * 60 * 1000,
  sleepMs: 21 * 60 * 60 * 1000,

  dailyStudyMin: 60,
  dailyPrayerMin: 10,

  honor: 100,
  strictMode: false,
  strictPinHash: '',

  crisisContainmentHours: 48,
  criticalPenalty: 30,

  audioEnabled: true,
  audioArmed: false,

  contractName: 'Flaviano',
  contractVersion: 1,
  contractRenewEveryDays: 90,

  weeklySocialMin: 2,
  trackWomenSeparate: true,

  npcStyle: 'mentor',
  theme: 'forge',

  day0: Date.now(),

  startWeightKg: 86,
  targetWeightKg: 78,

  kcal: 2300,
  proteinG: 190,
  fatG: 70,
  carbsG: 210
}
