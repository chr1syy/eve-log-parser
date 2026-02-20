export type EventType =
  | 'damage-dealt'
  | 'damage-received'
  | 'miss-incoming'
  | 'rep-received'
  | 'rep-outgoing'
  | 'neut-received'
  | 'neut-dealt'
  | 'nos-dealt'
  | 'warp-scram'
  | 'other'

export type HitQuality =
  | 'Wrecks' | 'Smashes' | 'Penetrates' | 'Hits'
  | 'Glances Off' | 'Grazes' | 'Barely Scratches'
  | 'misses' | 'unknown'

export type CapEventType = 'neut-received' | 'neut-dealt' | 'nos-dealt'

export type SecurityClass = 'highsec' | 'lowsec' | 'nullsec' | 'wormhole' | 'unknown'

export interface LogEntry {
  id: string
  timestamp: Date
  rawLine: string
  eventType: EventType

  // Damage fields (damage-dealt, damage-received)
  amount?: number
  hitQuality?: HitQuality
  weapon?: string
  isDrone?: boolean          // true if weapon is a drone type

  // Entity fields (pilot/NPC who dealt or received the damage/rep/neut)
  pilotName?: string         // player pilot name (null for NPCs)
  corpTicker?: string        // e.g. "TGRAD"
  shipType?: string          // e.g. "Typhoon", "Arch Gistii Thug"
  isNpc?: boolean            // true if attacker has no corp ticker

  // Rep fields (rep-received, rep-outgoing)
  repShipType?: string       // ship type of repper or rep target (from <u> tag)
  repModule?: string         // module name, e.g. "Medium Remote Armor Repairer II"
  isRepBot?: boolean         // true if repShipType is a drone/bot

  // Cap fields (neut-received, neut-dealt, nos-dealt)
  capAmount?: number         // GJ — always positive (abs value applied in parser)
  capEventType?: CapEventType
  capShipType?: string       // ship type of neuter (from <u> tag)
  capModule?: string         // module name, e.g. "Heavy Energy Neutralizer II"

  // Direction (for reps and cap events)
  direction?: 'outgoing' | 'incoming'
}

export interface ParsedLog {
  sessionId: string
  fileName: string
  parsedAt: Date
  characterName?: string
  sessionStart?: Date
  sessionEnd?: Date
  entries: LogEntry[]
  stats: LogStats
}

export interface LogStats {
  totalEvents: number
  // Damage
  damageDealt: number
  damageReceived: number
  topWeapons: { name: string; count: number; totalDamage: number }[]
  topTargets: { name: string; shipType: string; totalDamage: number }[]
  hitQualityDealt: Partial<Record<HitQuality, number>>
  hitQualityReceived: Partial<Record<HitQuality, number>>
  // Reps
  totalRepReceived: number
  totalRepOutgoing: number
  // Cap
  capNeutReceived: number
  capNeutDealt: number
  capNosDrained: number
  // Session
  activeTimeMinutes: number
  sessionStart?: Date
  sessionEnd?: Date

  // Damage — per-target breakdown (for DPS per target view)
  damageDealtByTarget: {
    target: string        // pilotName ?? shipType ?? 'Unknown'
    shipType: string
    corp?: string
    totalDamage: number
    hitCount: number
  }[]

  // Reps — per-source breakdown (for rep analysis view)
  repReceivedBySource: {
    shipType: string
    module: string
    isBot: boolean
    total: number
    hitCount: number
  }[]

  // Cap — per-module breakdown (for cap pressure view)
  capReceivedByShipType: {
    shipType: string
    totalGj: number
    hitCount: number
  }[]
  capDealtByModule: {
    module: string
    eventType: 'neut-dealt' | 'nos-dealt'
    totalGj: number
    hitCount: number
    zeroHits: number
  }[]
}
