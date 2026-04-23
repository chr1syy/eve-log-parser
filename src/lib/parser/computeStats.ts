import { HitQuality, LogEntry, LogStats } from '@/lib/types'

export function computeStats(entries: LogEntry[]): LogStats {
  let damageDealt = 0
  let damageReceived = 0
  let totalRepReceived = 0
  let totalRepOutgoing = 0
  let capNeutReceived = 0
  let capNeutDealt = 0
  let capNosDrained = 0

  const hitQualityDealt: Partial<Record<HitQuality, number>> = {}
  const hitQualityReceived: Partial<Record<HitQuality, number>> = {}

  // weapon → { count, totalDamage }
  const weaponMap = new Map<string, { count: number; totalDamage: number }>()
  // target → { shipType, totalDamage }
  const targetMap = new Map<string, { shipType: string; totalDamage: number }>()

  // target → { target, shipType, corp, totalDamage, hitCount }
  const damageByTargetMap = new Map<string, {
    target: string; shipType: string; corp?: string; totalDamage: number; hitCount: number
  }>()

  // repShipType+repModule → { shipType, module, isBot, total, hitCount }
  const repBySourceMap = new Map<string, {
    shipType: string; module: string; isBot: boolean; total: number; hitCount: number
  }>()

  // capShipType → { shipType, totalGj, hitCount }
  const capByShipTypeMap = new Map<string, { shipType: string; totalGj: number; hitCount: number }>()

  // capModule → { module, eventType, totalGj, hitCount, zeroHits }
  const capByModuleMap = new Map<string, {
    module: string; eventType: 'neut-dealt' | 'nos-dealt'; totalGj: number; hitCount: number; zeroHits: number
  }>()

  for (const entry of entries) {
    switch (entry.eventType) {
      case 'damage-dealt': {
        damageDealt += entry.amount ?? 0

        if (entry.weapon) {
          const existing = weaponMap.get(entry.weapon) ?? { count: 0, totalDamage: 0 }
          weaponMap.set(entry.weapon, {
            count: existing.count + 1,
            totalDamage: existing.totalDamage + (entry.amount ?? 0),
          })
        }

        const targetKey = entry.pilotName ?? entry.shipType ?? 'Unknown'
        const shipType = entry.shipType ?? 'Unknown'
        const existingTarget = targetMap.get(targetKey) ?? { shipType, totalDamage: 0 }
        targetMap.set(targetKey, {
          shipType: existingTarget.shipType,
          totalDamage: existingTarget.totalDamage + (entry.amount ?? 0),
        })

        // Per-target breakdown keyed by target+shipType for uniqueness
        const dtKey = targetKey + '\0' + shipType
        const existingDt = damageByTargetMap.get(dtKey) ?? {
          target: targetKey,
          shipType,
          corp: entry.corpTicker,
          totalDamage: 0,
          hitCount: 0,
        }
        damageByTargetMap.set(dtKey, {
          target: existingDt.target,
          shipType: existingDt.shipType,
          corp: existingDt.corp,
          totalDamage: existingDt.totalDamage + (entry.amount ?? 0),
          hitCount: existingDt.hitCount + 1,
        })

        if (entry.hitQuality) {
          hitQualityDealt[entry.hitQuality] = (hitQualityDealt[entry.hitQuality] ?? 0) + 1
        }
        break
      }

      case 'damage-received': {
        damageReceived += entry.amount ?? 0

        if (entry.hitQuality) {
          hitQualityReceived[entry.hitQuality] = (hitQualityReceived[entry.hitQuality] ?? 0) + 1
        }
        break
      }

      case 'rep-received': {
        totalRepReceived += entry.amount ?? 0

        const repShipType = entry.repShipType ?? 'Unknown'
        const repModule = entry.repModule ?? 'Unknown'
        const repKey = repShipType + '\0' + repModule
        const existingRep = repBySourceMap.get(repKey) ?? {
          shipType: repShipType,
          module: repModule,
          isBot: entry.isRepBot ?? false,
          total: 0,
          hitCount: 0,
        }
        repBySourceMap.set(repKey, {
          shipType: existingRep.shipType,
          module: existingRep.module,
          isBot: existingRep.isBot,
          total: existingRep.total + (entry.amount ?? 0),
          hitCount: existingRep.hitCount + 1,
        })
        break
      }

      case 'rep-outgoing': {
        totalRepOutgoing += entry.amount ?? 0
        break
      }

      case 'neut-received':
      case 'nos-received': {
        capNeutReceived += entry.capAmount ?? 0

        const capShipType = entry.capShipType ?? 'Unknown'
        const existingCap = capByShipTypeMap.get(capShipType) ?? {
          shipType: capShipType,
          totalGj: 0,
          hitCount: 0,
        }
        capByShipTypeMap.set(capShipType, {
          shipType: existingCap.shipType,
          totalGj: existingCap.totalGj + (entry.capAmount ?? 0),
          hitCount: existingCap.hitCount + 1,
        })
        break
      }

      case 'neut-dealt': {
        capNeutDealt += entry.capAmount ?? 0

        const capModule = entry.capModule ?? 'Unknown'
        const existingMod = capByModuleMap.get(capModule) ?? {
          module: capModule,
          eventType: 'neut-dealt' as const,
          totalGj: 0,
          hitCount: 0,
          zeroHits: 0,
        }
        capByModuleMap.set(capModule, {
          module: existingMod.module,
          eventType: existingMod.eventType,
          totalGj: existingMod.totalGj + (entry.capAmount ?? 0),
          hitCount: existingMod.hitCount + 1,
          zeroHits: existingMod.zeroHits + ((entry.capAmount ?? 0) === 0 ? 1 : 0),
        })
        break
      }

      case 'nos-dealt': {
        capNosDrained += entry.capAmount ?? 0

        const nosModule = entry.capModule ?? 'Unknown'
        const existingNos = capByModuleMap.get(nosModule) ?? {
          module: nosModule,
          eventType: 'nos-dealt' as const,
          totalGj: 0,
          hitCount: 0,
          zeroHits: 0,
        }
        capByModuleMap.set(nosModule, {
          module: existingNos.module,
          eventType: existingNos.eventType,
          totalGj: existingNos.totalGj + (entry.capAmount ?? 0),
          hitCount: existingNos.hitCount + 1,
          zeroHits: existingNos.zeroHits + ((entry.capAmount ?? 0) === 0 ? 1 : 0),
        })
        break
      }
    }
  }

  // Top weapons: sort by count desc, take top 10
  const topWeapons = Array.from(weaponMap.entries())
    .map(([name, { count, totalDamage }]) => ({ name, count, totalDamage }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Top targets: sort by totalDamage desc, take top 10
  const topTargets = Array.from(targetMap.entries())
    .map(([name, { shipType, totalDamage }]) => ({ name, shipType, totalDamage }))
    .sort((a, b) => b.totalDamage - a.totalDamage)
    .slice(0, 10)

  // damageDealtByTarget: sort by totalDamage desc
  const damageDealtByTarget = Array.from(damageByTargetMap.values())
    .sort((a, b) => b.totalDamage - a.totalDamage)

  // repReceivedBySource: sort by total desc
  const repReceivedBySource = Array.from(repBySourceMap.values())
    .sort((a, b) => b.total - a.total)

  // capReceivedByShipType: sort by totalGj desc
  const capReceivedByShipType = Array.from(capByShipTypeMap.values())
    .sort((a, b) => b.totalGj - a.totalGj)

  // capDealtByModule: sort by totalGj desc
  const capDealtByModule = Array.from(capByModuleMap.values())
    .sort((a, b) => b.totalGj - a.totalGj)

  // Active time in minutes
  let activeTimeMinutes = 0
  if (entries.length >= 2) {
    const firstTs = entries[0].timestamp.getTime()
    const lastTs = entries[entries.length - 1].timestamp.getTime()
    activeTimeMinutes = (lastTs - firstTs) / 60000
  }

  const sessionStart = entries.length > 0 ? entries[0].timestamp : undefined
  const sessionEnd = entries.length > 0 ? entries[entries.length - 1].timestamp : undefined

  return {
    totalEvents: entries.length,
    damageDealt,
    damageReceived,
    topWeapons,
    topTargets,
    hitQualityDealt,
    hitQualityReceived,
    totalRepReceived,
    totalRepOutgoing,
    capNeutReceived,
    capNeutDealt,
    capNosDrained,
    activeTimeMinutes,
    sessionStart,
    sessionEnd,
    damageDealtByTarget,
    repReceivedBySource,
    capReceivedByShipType,
    capDealtByModule,
  }
}
