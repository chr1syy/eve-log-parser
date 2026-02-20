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
