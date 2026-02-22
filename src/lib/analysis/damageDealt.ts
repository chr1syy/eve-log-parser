import type { LogEntry, HitQuality } from '../types'

export interface TargetEngagement {
  target: string           // pilotName or NPC name
  shipType: string
  corp?: string
  firstHit: Date
  lastHit: Date
  windowSeconds: number
  totalDamage: number
  hitCount: number
  dps: number              // totalDamage / windowSeconds (0 if single hit)
  minHit: number
  maxHit: number
  avgHit: number
  hitQualities: Partial<Record<HitQuality, number>>
}

export interface WeaponApplicationSummary {
  weapon: string
  isDrone: boolean
  hitCount: number
  totalDamage: number
  minHit: number
  maxHit: number
  avgHit: number
  hitQualities: Partial<Record<HitQuality, number>>
}

export interface DamageDealtAnalysis {
  engagements: TargetEngagement[]              // sorted by totalDamage desc
  weaponSummaries: WeaponApplicationSummary[]  // turrets/missiles
  droneSummaries: WeaponApplicationSummary[]   // drones only
  overallDps: number                           // total damage / total active combat seconds
  totalDamageDealt: number
  totalHits: number
  overallHitQualities: Partial<Record<HitQuality, number>>
}

export function analyzeDamageDealt(entries: LogEntry[]): DamageDealtAnalysis {
  // Filter to outgoing damage only
  const damageEntries = entries.filter((e) => e.eventType === 'damage-dealt')

  if (damageEntries.length === 0) {
    return {
      engagements: [],
      weaponSummaries: [],
      droneSummaries: [],
      overallDps: 0,
      totalDamageDealt: 0,
      totalHits: 0,
      overallHitQualities: {},
    }
  }

  // --- Engagement windows per target ---
  const engagementMap = new Map<string, LogEntry[]>()
  for (const entry of damageEntries) {
    const targetName = entry.pilotName ?? entry.shipType ?? 'Unknown'
    const shipType = entry.shipType ?? 'Unknown'
    const key = `${targetName}||${shipType}`
    if (!engagementMap.has(key)) engagementMap.set(key, [])
    engagementMap.get(key)!.push(entry)
  }

  const engagements: TargetEngagement[] = []
  for (const [key, group] of engagementMap) {
    const [targetName, shipType] = key.split('||')
    const timestamps = group.map((e) => e.timestamp.getTime())
    const firstHitMs = Math.min(...timestamps)
    const lastHitMs = Math.max(...timestamps)
    const firstHit = new Date(firstHitMs)
    const lastHit = new Date(lastHitMs)
    const rawWindowSeconds = (lastHitMs - firstHitMs) / 1000
    // Single hit: use 1s to avoid divide-by-zero, but mark dps = 0 to signal N/A
    const windowSeconds = rawWindowSeconds > 0 ? rawWindowSeconds : 1
    const isSingleHit = rawWindowSeconds === 0

    const amounts = group.map((e) => e.amount ?? 0)
    const totalDamage = amounts.reduce((a, b) => a + b, 0)
    const hitCount = group.length
    const minHit = Math.min(...amounts)
    const maxHit = Math.max(...amounts)
    const avgHit = hitCount > 0 ? totalDamage / hitCount : 0
    const dps = isSingleHit ? 0 : totalDamage / windowSeconds

    const hitQualities: Partial<Record<HitQuality, number>> = {}
    for (const entry of group) {
      if (entry.hitQuality) {
        hitQualities[entry.hitQuality] = (hitQualities[entry.hitQuality] ?? 0) + 1
      }
    }

    const corp = group.find((e) => e.corpTicker)?.corpTicker

    engagements.push({
      target: targetName,
      shipType,
      corp,
      firstHit,
      lastHit,
      windowSeconds,
      totalDamage,
      hitCount,
      dps,
      minHit,
      maxHit,
      avgHit,
      hitQualities,
    })
  }

  // Sort by totalDamage desc
  engagements.sort((a, b) => b.totalDamage - a.totalDamage)

  // --- Weapon summaries ---
  const weaponMap = new Map<string, LogEntry[]>()
  for (const entry of damageEntries) {
    const weapon = entry.weapon ?? 'Unknown'
    if (!weaponMap.has(weapon)) weaponMap.set(weapon, [])
    weaponMap.get(weapon)!.push(entry)
  }

  const weaponSummaries: WeaponApplicationSummary[] = []
  const droneSummaries: WeaponApplicationSummary[] = []

  for (const [weapon, group] of weaponMap) {
    const isDrone = group.some((e) => e.isDrone === true)
    const amounts = group.map((e) => e.amount ?? 0)
    const totalDamage = amounts.reduce((a, b) => a + b, 0)
    const hitCount = group.length
    const minHit = Math.min(...amounts)
    const maxHit = Math.max(...amounts)
    const avgHit = hitCount > 0 ? totalDamage / hitCount : 0

    const hitQualities: Partial<Record<HitQuality, number>> = {}
    for (const entry of group) {
      if (entry.hitQuality) {
        hitQualities[entry.hitQuality] = (hitQualities[entry.hitQuality] ?? 0) + 1
      }
    }

    const summary: WeaponApplicationSummary = {
      weapon,
      isDrone,
      hitCount,
      totalDamage,
      minHit,
      maxHit,
      avgHit,
      hitQualities,
    }

    if (isDrone) {
      droneSummaries.push(summary)
    } else {
      weaponSummaries.push(summary)
    }
  }

  // Sort by totalDamage desc
  weaponSummaries.sort((a, b) => b.totalDamage - a.totalDamage)
  droneSummaries.sort((a, b) => b.totalDamage - a.totalDamage)

  // --- Overall stats ---
  const allTimestamps = damageEntries.map((e) => e.timestamp.getTime())
  const firstMs = Math.min(...allTimestamps)
  const lastMs = Math.max(...allTimestamps)
  const overallWindowSeconds = (lastMs - firstMs) / 1000
  const totalDamageDealt = damageEntries.reduce((a, e) => a + (e.amount ?? 0), 0)
  const overallDps = overallWindowSeconds > 0 ? totalDamageDealt / overallWindowSeconds : 0
  const totalHits = damageEntries.length

  const overallHitQualities: Partial<Record<HitQuality, number>> = {}
  for (const entry of damageEntries) {
    if (entry.hitQuality) {
      overallHitQualities[entry.hitQuality] = (overallHitQualities[entry.hitQuality] ?? 0) + 1
    }
  }

  return {
    engagements,
    weaponSummaries,
    droneSummaries,
    overallDps,
    totalDamageDealt,
    totalHits,
    overallHitQualities,
  }
}

export interface DamageDealtPoint {
  timestamp: Date
  dps: number        // rolling 10s total outgoing DPS
  badHitPct: number  // % of hits in this window that are Glances Off or Grazes
}

export interface TackleWindow {
  start: Date
  end: Date
  targetShip?: string
}

export interface DamageDealtTimeSeries {
  points: DamageDealtPoint[]
  tackleWindows: TackleWindow[]
}

const BAD_HIT_QUALITIES = new Set<HitQuality>(['Glances Off', 'Grazes'])
const WINDOW_MS = 10_000

export function computeTackleWindows(entries: LogEntry[]): TackleWindow[] {
  const scramEvents = entries
    .filter((e) => e.eventType === 'warp-scram' && e.tackleDirection === 'outgoing')
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  if (scramEvents.length === 0) return []

  const windows: TackleWindow[] = []
  let windowStart = scramEvents[0].timestamp
  let windowEnd = scramEvents[0].timestamp
  let targetShip = scramEvents[0].tackleTarget
  const MERGE_GAP_MS = 20_000

  for (let i = 1; i < scramEvents.length; i++) {
    const curr = scramEvents[i].timestamp.getTime()
    const prev = windowEnd.getTime()
    if (curr - prev <= MERGE_GAP_MS) {
      windowEnd = scramEvents[i].timestamp
    } else {
      windows.push({
        start: windowStart,
        end: new Date(windowEnd.getTime() + MERGE_GAP_MS),
        targetShip,
      })
      windowStart = scramEvents[i].timestamp
      windowEnd = scramEvents[i].timestamp
      targetShip = scramEvents[i].tackleTarget
    }
  }
  windows.push({
    start: windowStart,
    end: new Date(windowEnd.getTime() + MERGE_GAP_MS),
    targetShip,
  })

  return windows
}

export function generateDamageDealtTimeSeries(entries: LogEntry[]): DamageDealtTimeSeries {
  const dealtEntries = entries
    .filter((e) => e.eventType === 'damage-dealt')
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const missEntries = entries.filter((e) => e.eventType === 'miss-outgoing')

  const tackleWindows = computeTackleWindows(entries)

  if (dealtEntries.length === 0) return { points: [], tackleWindows }

  // All shot events (hits + misses) sorted for bad-hit % calculation
  const allShots = [...dealtEntries, ...missEntries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  )

  const points: DamageDealtPoint[] = []
  let prevSecond = -1

  for (const entry of dealtEntries) {
    const t = entry.timestamp.getTime()
    const second = Math.floor(t / 1000)
    if (second === prevSecond) continue  // one point per second
    prevSecond = second

    const windowStart = t - WINDOW_MS

    // DPS: sum of damage-dealt amounts in window / 10s
    const windowDamage = dealtEntries
      .filter((e) => {
        const et = e.timestamp.getTime()
        return et > windowStart && et <= t
      })
      .reduce((sum, e) => sum + (e.amount ?? 0), 0)
    const dps = windowDamage / (WINDOW_MS / 1000)

    // Bad hit %: (Glances Off + Grazes) / total shots (hits + misses) in window
    const shotsInWindow = allShots.filter((e) => {
      const et = e.timestamp.getTime()
      return et > windowStart && et <= t
    })
    const totalShots = shotsInWindow.length
    const badHits = shotsInWindow.filter(
      (e) => e.hitQuality != null && BAD_HIT_QUALITIES.has(e.hitQuality),
    ).length
    const badHitPct = totalShots > 0 ? (badHits / totalShots) * 100 : 0

    points.push({ timestamp: entry.timestamp, dps, badHitPct })
  }

  return { points, tackleWindows }
}
