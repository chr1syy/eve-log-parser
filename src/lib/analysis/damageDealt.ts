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

export interface DamageDealtTimePoint {
  timestamp: Date
  badHitPct: number          // 0–100
  damageByTarget: Record<string, number>  // target label → damage in window
}

export interface DamageDealtTimeSeries {
  points: DamageDealtTimePoint[]
  topTargets: string[]       // ordered list of target labels (up to maxTargets)
}

const BAD_HIT_QUALITIES = new Set<HitQuality>(['Glances Off', 'Grazes'])

export function generateDamageDealtTimeSeries(
  entries: LogEntry[],
  windowSeconds = 10,
  maxTargets = 6,
): DamageDealtTimeSeries {
  const sorted = entries
    .filter((e) => e.eventType === 'damage-dealt')
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  if (sorted.length === 0) return { points: [], topTargets: [] }

  // Identify top N targets by total damage dealt
  const targetDamageMap = new Map<string, number>()
  for (const e of sorted) {
    const key = e.pilotName ?? e.shipType ?? 'Unknown'
    targetDamageMap.set(key, (targetDamageMap.get(key) ?? 0) + (e.amount ?? 0))
  }
  const topTargets = [...targetDamageMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTargets)
    .map(([name]) => name)

  const WINDOW_MS = windowSeconds * 1000
  const points: DamageDealtTimePoint[] = []
  let prevSecond = -1

  for (const entry of sorted) {
    const t = entry.timestamp.getTime()
    const second = Math.floor(t / 1000)
    if (second === prevSecond) continue   // one point per second
    prevSecond = second

    const windowStart = t - WINDOW_MS
    const inWindow = sorted.filter((e) => {
      const et = e.timestamp.getTime()
      return et >= windowStart && et <= t
    })

    const damageByTarget: Record<string, number> = {}
    for (const target of topTargets) {
      damageByTarget[target] = inWindow
        .filter((e) => (e.pilotName ?? e.shipType ?? 'Unknown') === target)
        .reduce((sum, e) => sum + (e.amount ?? 0), 0)
    }

    const totalHits = inWindow.length
    const badHits = inWindow.filter(
      (e) => e.hitQuality != null && BAD_HIT_QUALITIES.has(e.hitQuality),
    ).length
    const badHitPct = totalHits > 0 ? (badHits / totalHits) * 100 : 0

    points.push({ timestamp: entry.timestamp, badHitPct, damageByTarget })
  }

  return { points, topTargets }
}
