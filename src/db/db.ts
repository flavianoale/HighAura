import Dexie, { Table } from 'dexie'

export type Pillar = 'shape' | 'intelecto' | 'psicologico' | 'espiritual' | 'social'

export type EventType =
  | 'app_opened'
  | 'block_started'
  | 'timer_tick'
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
  | 'pur90_completed'
  | 'strict_mode_changed'
  | 'contract_signed'
  | 'contract_renewed'
  | 'backup_exported'
  | 'backup_imported'

export interface AppEvent {
  id?: number
  ts: number
  type: EventType
  data?: any
}

export interface Settings {
  id: 'singleton'
  // Anchors (ms from midnight local)
  wakeMs: number
  lunchMs: number
  sleepMs: number

  // Non-negotiables (defaults)
  dailyStudyMin: number // minutes
  dailyPrayerMin: number // minutes

  // Military rules
  honor: number // 0..100
  strictMode: boolean
  strictPinHash: string // sha256 hex of pin
  crisisContainmentHours: number // 48
  criticalPenalty: number // 30

  // Audio
  audioEnabled: boolean
  audioArmed: boolean

  // Contract
  contractSignedAt?: number
  contractName: string
  contractVersion: number
  contractRenewEveryDays: number // 90

  // Social
  weeklySocialMin: number // 2
  trackWomenSeparate: boolean

  // UI
  npcStyle: 'mentor'
  theme: 'forge'

  // Macro
  day0?: number // start of "Dia X de Forja"
}

export interface AudioAsset {
  id: 'main'
  mime: string
  blob: Blob
  updatedAt: number
}

export class HighAuraDB extends Dexie {
  events!: Table<AppEvent, number>
  settings!: Table<Settings, string>
  audio!: Table<AudioAsset, string>

  constructor() {
    super('highAura')
    this.version(1).stores({
      events: '++id, ts, type',
      settings: 'id',
      audio: 'id'
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

  day0: Date.now()
}
