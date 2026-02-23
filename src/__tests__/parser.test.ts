import { describe, it, expect } from 'vitest'
import {
  stripTags,
  extractUnderlinkText,
  parseCombatLine,
} from '@/lib/parser/eveLogParser'
import { computeStats } from '@/lib/parser/computeStats'
import { filterOutHostileNpcs } from '@/lib/npcFilter'
import { EventType, LogEntry } from '@/lib/types'

// ────────────────────────────────────────────────────────────
// stripTags
// ────────────────────────────────────────────────────────────
describe('stripTags', () => {
  it('strips all EVE HTML markup from a damage-dealt line', () => {
    const raw =
      '<color=0xff00ffff><b>367</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>Kasa Habalu[TGRAD](Typhoon)</b><font size=10><color=0x77ffffff> - Heavy Entropic Disintegrator II - Glances Off'
    const result = stripTags(raw)
    expect(result).toBe('367 to Kasa Habalu[TGRAD](Typhoon) - Heavy Entropic Disintegrator II - Glances Off')
  })

  it('strips fontsize tags', () => {
    const raw = '<fontsize=12><b>hello</b></fontsize>'
    expect(stripTags(raw)).toBe('hello')
  })

  it('strips underline tags', () => {
    const raw = '<u>Typhoon</u>'
    expect(stripTags(raw)).toBe('Typhoon')
  })

  it('collapses multiple spaces', () => {
    const raw = '<b>100</b>  <font size=10>GJ</font>'
    expect(stripTags(raw)).toBe('100 GJ')
  })
})

// ────────────────────────────────────────────────────────────
// extractUnderlinkText
// ────────────────────────────────────────────────────────────
describe('extractUnderlinkText', () => {
  it('returns text between <u> tags', () => {
    const raw = '<color=0xFFFFFF00><b> <u>Typhoon</u></b></color>'
    expect(extractUnderlinkText(raw)).toBe('Typhoon')
  })

  it('handles nested markup inside <u> tags', () => {
    const raw = '<u><b>Brutix Navy Issue</b></u>'
    expect(extractUnderlinkText(raw)).toBe('Brutix Navy Issue')
  })

  it('returns null when no <u> tag', () => {
    const raw = '<color=0xff00ffff><b>367</b>'
    expect(extractUnderlinkText(raw)).toBeNull()
  })
})

// ────────────────────────────────────────────────────────────
// parseCombatLine — damage-dealt (player)
// ────────────────────────────────────────────────────────────
describe('parseCombatLine — damage-dealt', () => {
  const ts = new Date('2025-10-23T02:08:58')

  it('parses a player damage-dealt line', () => {
    const raw =
      '<color=0xff00ffff><b>367</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>Kasa Habalu[TGRAD](Typhoon)</b><font size=10><color=0x77ffffff> - Heavy Entropic Disintegrator II - Glances Off'
    const entry = parseCombatLine(raw, ts, 'test-1')
    expect(entry.eventType).toBe('damage-dealt')
    expect(entry.amount).toBe(367)
    expect(entry.pilotName).toBe('Kasa Habalu')
    expect(entry.corpTicker).toBe('TGRAD')
    expect(entry.shipType).toBe('Typhoon')
    expect(entry.weapon).toBe('Heavy Entropic Disintegrator II')
    expect(entry.hitQuality).toBe('Glances Off')
    expect(entry.isNpc).toBe(false)
    expect(entry.isDrone).toBe(false)
  })

  it('detects drone weapon', () => {
    const raw =
      '<color=0xff00ffff><b>200</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>Target[CORP](Ship)</b><font size=10><color=0x77ffffff> - Hammerhead II - Hits'
    const entry = parseCombatLine(raw, ts, 'test-drone')
    expect(entry.isDrone).toBe(true)
  })

  it('detects faction drone weapon without tier suffix (e.g. Imperial Navy Praetor)', () => {
    const raw =
      '<color=0xff00ffff><b>350</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>Target[CORP](Ship)</b><font size=10><color=0x77ffffff> - Imperial Navy Praetor - Smashes'
    const entry = parseCombatLine(raw, ts, 'test-faction-drone')
    expect(entry.isDrone).toBe(true)
  })

  it('detects faction drone weapon without tier suffix (e.g. Caldari Navy Hornet)', () => {
    const raw =
      '<color=0xff00ffff><b>80</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>Target[CORP](Ship)</b><font size=10><color=0x77ffffff> - Caldari Navy Hornet - Hits'
    const entry = parseCombatLine(raw, ts, 'test-faction-drone-2')
    expect(entry.isDrone).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────
// parseCombatLine — damage-received (player)
// ────────────────────────────────────────────────────────────
describe('parseCombatLine — damage-received (player)', () => {
  const ts = new Date('2025-10-23T02:08:39')

  it('parses a player damage-received line', () => {
    const raw =
      '<color=0xffcc0000><b>1021</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Kasa Habalu[TGRAD](Typhoon)</b><font size=10><color=0x77ffffff> - Caldari Navy Mjolnir Heavy Missile - Hits'
    const entry = parseCombatLine(raw, ts, 'test-2')
    expect(entry.eventType).toBe('damage-received')
    expect(entry.amount).toBe(1021)
    expect(entry.pilotName).toBe('Kasa Habalu')
    expect(entry.corpTicker).toBe('TGRAD')
    expect(entry.shipType).toBe('Typhoon')
    expect(entry.weapon).toBe('Caldari Navy Mjolnir Heavy Missile')
    expect(entry.hitQuality).toBe('Hits')
    expect(entry.isNpc).toBe(false)
  })
})

// ────────────────────────────────────────────────────────────
// parseCombatLine — damage-received (NPC with weapon)
// ────────────────────────────────────────────────────────────
describe('parseCombatLine — damage-received (NPC)', () => {
  const ts = new Date('2026-02-19T05:33:16')

  it('parses NPC damage-received with weapon', () => {
    const raw =
      '<color=0xffcc0000><b>18</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Arch Gistii Thug</b><font size=10><color=0x77ffffff> - Nova Light Missile - Hits'
    const entry = parseCombatLine(raw, ts, 'test-3')
    expect(entry.eventType).toBe('damage-received')
    expect(entry.amount).toBe(18)
    expect(entry.shipType).toBe('Arch Gistii Thug')
    expect(entry.weapon).toBe('Nova Light Missile')
    expect(entry.hitQuality).toBe('Hits')
    expect(entry.isNpc).toBe(true)
    expect(entry.pilotName).toBeUndefined()
  })

  it('parses NPC damage-received without weapon', () => {
    const raw =
      '<color=0xffcc0000><b>6</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Arch Gistii Rogue</b><font size=10><color=0x77ffffff> - Glances Off'
    const entry = parseCombatLine(raw, ts, 'test-4')
    expect(entry.eventType).toBe('damage-received')
    expect(entry.amount).toBe(6)
    expect(entry.shipType).toBe('Arch Gistii Rogue')
    expect(entry.hitQuality).toBe('Glances Off')
    expect(entry.weapon).toBeUndefined()
    expect(entry.isNpc).toBe(true)
  })

  it('parses Centatis Wraith damage-received with weapon', () => {
    const raw =
      '<color=0xffcc0000><b>50</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Centatis Wraith</b><font size=10><color=0x77ffffff> - Nova Rocket - Hits'
    const entry = parseCombatLine(raw, ts, 'test-centatis-wraith')
    expect(entry.eventType).toBe('damage-received')
    expect(entry.amount).toBe(50)
    expect(entry.shipType).toBe('Centatis Wraith')
    expect(entry.weapon).toBe('Nova Rocket')
    expect(entry.hitQuality).toBe('Hits')
    expect(entry.isNpc).toBe(true)
    expect(entry.pilotName).toBeUndefined()
  })

  it('parses Centatis Daemon damage-received with weapon', () => {
    const raw =
      '<color=0xffcc0000><b>75</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Centatis Daemon</b><font size=10><color=0x77ffffff> - Nova Heavy Missile - Penetrates'
    const entry = parseCombatLine(raw, ts, 'test-centatis-daemon')
    expect(entry.eventType).toBe('damage-received')
    expect(entry.amount).toBe(75)
    expect(entry.shipType).toBe('Centatis Daemon')
    expect(entry.weapon).toBe('Nova Heavy Missile')
    expect(entry.hitQuality).toBe('Penetrates')
    expect(entry.isNpc).toBe(true)
  })

  it('parses Centus Tyrant damage-received with weapon', () => {
    const raw =
      '<color=0xffcc0000><b>120</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Centus Tyrant</b><font size=10><color=0x77ffffff> - Nova Cruise Missile - Smashes'
    const entry = parseCombatLine(raw, ts, 'test-centus-tyrant')
    expect(entry.eventType).toBe('damage-received')
    expect(entry.amount).toBe(120)
    expect(entry.shipType).toBe('Centus Tyrant')
    expect(entry.weapon).toBe('Nova Cruise Missile')
    expect(entry.hitQuality).toBe('Smashes')
    expect(entry.isNpc).toBe(true)
  })

  it('parses Centus Dread Lord damage-received with weapon', () => {
    const raw =
      '<color=0xffcc0000><b>200</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Centus Dread Lord</b><font size=10><color=0x77ffffff> - Caldari Navy Mjolnir Heavy Missile - Wrecks'
    const entry = parseCombatLine(raw, ts, 'test-centus-dread-lord')
    expect(entry.eventType).toBe('damage-received')
    expect(entry.amount).toBe(200)
    expect(entry.shipType).toBe('Centus Dread Lord')
    expect(entry.weapon).toBe('Caldari Navy Mjolnir Heavy Missile')
    expect(entry.hitQuality).toBe('Wrecks')
    expect(entry.isNpc).toBe(true)
  })

  it('parses Centatis Behemoth damage-received without weapon', () => {
    const raw =
      '<color=0xffcc0000><b>300</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Centatis Behemoth</b><font size=10><color=0x77ffffff> - Grazes'
    const entry = parseCombatLine(raw, ts, 'test-centatis-behemoth')
    expect(entry.eventType).toBe('damage-received')
    expect(entry.amount).toBe(300)
    expect(entry.shipType).toBe('Centatis Behemoth')
    expect(entry.hitQuality).toBe('Grazes')
    expect(entry.weapon).toBeUndefined()
    expect(entry.isNpc).toBe(true)
  })

  it('parses Centatis Devil damage-received with weapon', () => {
    const raw =
      '<color=0xffcc0000><b>150</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Centatis Devil</b><font size=10><color=0x77ffffff> - Heavy Entropic Disintegrator II - Hits'
    const entry = parseCombatLine(raw, ts, 'test-centatis-devil')
    expect(entry.eventType).toBe('damage-received')
    expect(entry.amount).toBe(150)
    expect(entry.shipType).toBe('Centatis Devil')
    expect(entry.weapon).toBe('Heavy Entropic Disintegrator II')
    expect(entry.hitQuality).toBe('Hits')
    expect(entry.isNpc).toBe(true)
  })

  it('parses Sansha\'s Horror damage-received with weapon', () => {
    const raw =
      '<color=0xffcc0000><b>250</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Sansha\'s Horror</b><font size=10><color=0x77ffffff> - Dual Heavy Pulse Laser II - Penetrates'
    const entry = parseCombatLine(raw, ts, 'test-sanshas-horror')
    expect(entry.eventType).toBe('damage-received')
    expect(entry.amount).toBe(250)
    expect(entry.shipType).toBe('Sansha\'s Horror')
    expect(entry.weapon).toBe('Dual Heavy Pulse Laser II')
    expect(entry.hitQuality).toBe('Penetrates')
    expect(entry.isNpc).toBe(true)
  })

// ────────────────────────────────────────────────────────────
// parseCombatLine — miss
// ────────────────────────────────────────────────────────────
describe('parseCombatLine — miss-incoming', () => {
  it('parses a bare NPC miss line', () => {
    const raw = 'Arch Gistii Thug misses you completely'
    const entry = parseCombatLine(raw, new Date(), 'test-5')
    expect(entry.eventType).toBe('miss-incoming')
    expect(entry.pilotName).toBe('Arch Gistii Thug')
    expect(entry.weapon).toBeUndefined()
  })

  it('parses an incoming miss with weapon suffix', () => {
    const raw = 'Kasa Habalu misses you completely - Caldari Navy Mjolnir Heavy Missile'
    const entry = parseCombatLine(raw, new Date(), 'test-5b')
    expect(entry.eventType).toBe('miss-incoming')
    expect(entry.pilotName).toBe('Kasa Habalu')
    expect(entry.weapon).toBe('Caldari Navy Mjolnir Heavy Missile')
    expect(entry.isDrone).toBe(false)
  })

  it('parses an incoming drone miss with "belonging to" format', () => {
    const raw = 'Infiltrator II belonging to Kasa Habalu misses you completely - Infiltrator II'
    const entry = parseCombatLine(raw, new Date(), 'test-5c')
    expect(entry.eventType).toBe('miss-incoming')
    expect(entry.weapon).toBe('Infiltrator II')
    expect(entry.pilotName).toBe('Kasa Habalu')
    expect(entry.isDrone).toBe(true)
  })
})

describe('parseCombatLine — miss-outgoing', () => {
  it('parses an outgoing miss line', () => {
    const raw = 'Your Heavy Entropic Disintegrator II misses Kasa Habalu completely'
    const entry = parseCombatLine(raw, new Date(), 'test-5d')
    expect(entry.eventType).toBe('miss-outgoing')
    expect(entry.weapon).toBe('Heavy Entropic Disintegrator II')
    expect(entry.shipType).toBe('Kasa Habalu')
    expect(entry.isDrone).toBe(false)
  })

  it('parses an outgoing drone miss line', () => {
    const raw = 'Your Wasp II misses Target Frigate completely - Wasp II'
    const entry = parseCombatLine(raw, new Date(), 'test-5e')
    expect(entry.eventType).toBe('miss-outgoing')
    expect(entry.weapon).toBe('Wasp II')
    expect(entry.shipType).toBe('Target Frigate')
    expect(entry.isDrone).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────
// EventType — miss-outgoing is in the union
// ────────────────────────────────────────────────────────────
describe('EventType — miss-outgoing', () => {
  it('includes miss-outgoing in the EventType union (type-level)', () => {
    const type: EventType = 'miss-outgoing'
    expect(type).toBe('miss-outgoing')
  })
})

// ────────────────────────────────────────────────────────────
// LogEntry — warp-scram tackle fields
// ────────────────────────────────────────────────────────────
describe('LogEntry — tackle fields', () => {
  const ts = new Date('2025-10-23T02:10:00')

  it('accepts tackleDirection outgoing on a warp-scram entry', () => {
    const entry: LogEntry = {
      id: 'test-tackle-1',
      timestamp: ts,
      rawLine: '',
      eventType: 'warp-scram',
      tackleDirection: 'outgoing',
      tackleTarget: 'Ishtar',
    }
    expect(entry.tackleDirection).toBe('outgoing')
    expect(entry.tackleTarget).toBe('Ishtar')
    expect(entry.tackleSource).toBeUndefined()
  })

  it('accepts tackleDirection incoming on a warp-scram entry', () => {
    const entry: LogEntry = {
      id: 'test-tackle-2',
      timestamp: ts,
      rawLine: '',
      eventType: 'warp-scram',
      tackleDirection: 'incoming',
      tackleSource: 'Proteus',
    }
    expect(entry.tackleDirection).toBe('incoming')
    expect(entry.tackleSource).toBe('Proteus')
    expect(entry.tackleTarget).toBeUndefined()
  })
})

// ────────────────────────────────────────────────────────────
// parseCombatLine — warp-scram
// ────────────────────────────────────────────────────────────
describe('parseCombatLine — warp-scram', () => {
  const ts = new Date('2025-10-23T02:10:00')

  it('parses outgoing warp scramble (you → target ship)', () => {
    const raw = '<color=0xffffffff>Warp scramble attempt from you to <u>Ishtar</u>'
    const entry = parseCombatLine(raw, ts, 'test-scram-1')
    expect(entry.eventType).toBe('warp-scram')
    expect(entry.tackleDirection).toBe('outgoing')
    expect(entry.tackleTarget).toBe('Ishtar')
    expect(entry.tackleSource).toBeUndefined()
  })

  it('parses incoming warp scramble (enemy ship → you)', () => {
    const raw = '<color=0xffffffff>Warp scramble attempt from <u>Proteus</u> to you'
    const entry = parseCombatLine(raw, ts, 'test-scram-2')
    expect(entry.eventType).toBe('warp-scram')
    expect(entry.tackleDirection).toBe('incoming')
    expect(entry.tackleSource).toBe('Proteus')
    expect(entry.tackleTarget).toBeUndefined()
  })

  it('parses outgoing warp disruption (you → target ship)', () => {
    const raw = '<color=0xffffffff>Warp disruption attempt from you to <u>Huginn</u>'
    const entry = parseCombatLine(raw, ts, 'test-scram-3')
    expect(entry.eventType).toBe('warp-scram')
    expect(entry.tackleDirection).toBe('outgoing')
    expect(entry.tackleTarget).toBe('Huginn')
    expect(entry.tackleSource).toBeUndefined()
  })

  it('parses incoming warp scramble with exclamation (to you!)', () => {
    const raw = '<color=0xffffffff>Warp scramble attempt from <u>Sabre</u> to you!'
    const entry = parseCombatLine(raw, ts, 'test-scram-4')
    expect(entry.eventType).toBe('warp-scram')
    expect(entry.tackleDirection).toBe('incoming')
    expect(entry.tackleSource).toBe('Sabre')
    expect(entry.tackleTarget).toBeUndefined()
  })
})

// ────────────────────────────────────────────────────────────
// parseCombatLine — rep-received
// ────────────────────────────────────────────────────────────
describe('parseCombatLine — rep-received', () => {
  const ts = new Date('2025-10-23T02:08:48')

  it('parses a rep-received line', () => {
    const raw =
      '<color=0xffccff66><b>256</b><color=0x77ffffff><font size=10> remote armor repaired by </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Vedmak</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Remote Armor Repairer II</font>'
    const entry = parseCombatLine(raw, ts, 'test-6')
    expect(entry.eventType).toBe('rep-received')
    expect(entry.direction).toBe('incoming')
    expect(entry.amount).toBe(256)
    expect(entry.repShipType).toBe('Vedmak')
    expect(entry.repModule).toBe('Medium Remote Armor Repairer II')
    expect(entry.isRepBot).toBe(false)
  })

  it('detects repair bot', () => {
    const raw =
      '<color=0xffccff66><b>120</b><color=0x77ffffff><font size=10> remote armor repaired by </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Medium Armor Maintenance Bot I</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Armor Maintenance Bot I</font>'
    const entry = parseCombatLine(raw, ts, 'test-6b')
    expect(entry.isRepBot).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────
// parseCombatLine — rep-outgoing
// ────────────────────────────────────────────────────────────
describe('parseCombatLine — rep-outgoing', () => {
  const ts = new Date('2025-10-23T02:09:00')

  it('parses a rep-outgoing line', () => {
    const raw =
      '<color=0xffccff66><b>256</b><color=0x77ffffff><font size=10> remote armor repaired to </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Vedmak</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Remote Armor Repairer II</font>'
    const entry = parseCombatLine(raw, ts, 'test-7')
    expect(entry.eventType).toBe('rep-outgoing')
    expect(entry.direction).toBe('outgoing')
    expect(entry.amount).toBe(256)
    expect(entry.repShipType).toBe('Vedmak')
    expect(entry.repModule).toBe('Medium Remote Armor Repairer II')
  })
})

// ────────────────────────────────────────────────────────────
// parseCombatLine — neut-received
// ────────────────────────────────────────────────────────────
describe('parseCombatLine — neut-received', () => {
  const ts = new Date('2025-10-23T02:08:37')

  it('parses a neut-received line', () => {
    const raw =
      '<color=0xffe57f7f><b>438 GJ</b><color=0x77ffffff><font size=10> energy neutralized </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Typhoon</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Heavy Energy Neutralizer II</font>'
    const entry = parseCombatLine(raw, ts, 'test-8')
    expect(entry.eventType).toBe('neut-received')
    expect(entry.capEventType).toBe('neut-received')
    expect(entry.direction).toBe('incoming')
    expect(entry.capAmount).toBe(438)
    expect(entry.capShipType).toBe('Typhoon')
    expect(entry.capModule).toBe('Heavy Energy Neutralizer II')
  })
})

// ────────────────────────────────────────────────────────────
// parseCombatLine — neut-dealt
// ────────────────────────────────────────────────────────────
describe('parseCombatLine — neut-dealt', () => {
  const ts = new Date('2025-10-23T02:11:40')

  it('parses a neut-dealt line', () => {
    const raw =
      '<color=0xff7fffff><b>165 GJ</b><color=0x77ffffff><font size=10> energy neutralized </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Proteus</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Infectious Scoped Energy Neutralizer</font>'
    const entry = parseCombatLine(raw, ts, 'test-9')
    expect(entry.eventType).toBe('neut-dealt')
    expect(entry.capEventType).toBe('neut-dealt')
    expect(entry.direction).toBe('outgoing')
    expect(entry.capAmount).toBe(165)
    expect(entry.capShipType).toBe('Proteus')
    expect(entry.capModule).toBe('Medium Infectious Scoped Energy Neutralizer')
  })
})

// ────────────────────────────────────────────────────────────
// parseCombatLine — nos-dealt
// ────────────────────────────────────────────────────────────
describe('parseCombatLine — nos-dealt', () => {
  const ts = new Date('2025-10-23T02:10:23')

  it('parses a nos-dealt line with -0 GJ', () => {
    const raw =
      '<color=0xffe57f7f><b>-0 GJ</b><color=0x77ffffff><font size=10> energy drained to </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Brutix Navy Issue</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Energy Nosferatu II</font>'
    const entry = parseCombatLine(raw, ts, 'test-10')
    expect(entry.eventType).toBe('nos-dealt')
    expect(entry.capEventType).toBe('nos-dealt')
    expect(entry.direction).toBe('outgoing')
    expect(entry.capAmount).toBe(0)
    expect(entry.capShipType).toBe('Brutix Navy Issue')
    expect(entry.capModule).toBe('Medium Energy Nosferatu II')
  })

  it('parses a nos-dealt line with -7 GJ', () => {
    const raw =
      '<color=0xffe57f7f><b>-7 GJ</b><color=0x77ffffff><font size=10> energy drained to </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Typhoon</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Energy Nosferatu II</font>'
    const entry = parseCombatLine(raw, ts, 'test-11')
    expect(entry.capAmount).toBe(7)
  })
})

// ────────────────────────────────────────────────────────────
// computeStats
// ────────────────────────────────────────────────────────────
describe('computeStats', () => {
  const ts1 = new Date('2025-10-23T02:08:00')
  const ts2 = new Date('2025-10-23T02:09:00')
  const ts3 = new Date('2025-10-23T02:10:00')

  const entries: LogEntry[] = [
    {
      id: '1',
      timestamp: ts1,
      rawLine: '',
      eventType: 'damage-dealt',
      amount: 500,
      pilotName: 'Target Alpha',
      shipType: 'Typhoon',
      weapon: 'Heavy Entropic Disintegrator II',
      hitQuality: 'Hits',
    },
    {
      id: '2',
      timestamp: ts2,
      rawLine: '',
      eventType: 'damage-dealt',
      amount: 300,
      pilotName: 'Target Alpha',
      shipType: 'Typhoon',
      weapon: 'Heavy Entropic Disintegrator II',
      hitQuality: 'Glances Off',
    },
    {
      id: '3',
      timestamp: ts3,
      rawLine: '',
      eventType: 'damage-dealt',
      amount: 200,
      pilotName: 'Target Beta',
      shipType: 'Brutix',
      weapon: 'Neutron Blaster II',
      hitQuality: 'Hits',
    },
    {
      id: '4',
      timestamp: ts1,
      rawLine: '',
      eventType: 'damage-received',
      amount: 800,
      hitQuality: 'Penetrates',
    },
    {
      id: '5',
      timestamp: ts2,
      rawLine: '',
      eventType: 'damage-received',
      amount: 400,
      hitQuality: 'Hits',
    },
  ]

  it('calculates damageDealt correctly', () => {
    const stats = computeStats(entries)
    expect(stats.damageDealt).toBe(1000)
  })

  it('calculates damageReceived correctly', () => {
    const stats = computeStats(entries)
    expect(stats.damageReceived).toBe(1200)
  })

  it('calculates totalEvents correctly', () => {
    const stats = computeStats(entries)
    expect(stats.totalEvents).toBe(5)
  })

  it('calculates topWeapons sorted by count', () => {
    const stats = computeStats(entries)
    expect(stats.topWeapons[0].name).toBe('Heavy Entropic Disintegrator II')
    expect(stats.topWeapons[0].count).toBe(2)
    expect(stats.topWeapons[0].totalDamage).toBe(800)
  })

  it('calculates topTargets sorted by totalDamage', () => {
    const stats = computeStats(entries)
    expect(stats.topTargets[0].name).toBe('Target Alpha')
    expect(stats.topTargets[0].totalDamage).toBe(800)
  })

  it('calculates hitQualityDealt', () => {
    const stats = computeStats(entries)
    expect(stats.hitQualityDealt['Hits']).toBe(2)
    expect(stats.hitQualityDealt['Glances Off']).toBe(1)
  })

  it('calculates hitQualityReceived', () => {
    const stats = computeStats(entries)
    expect(stats.hitQualityReceived['Penetrates']).toBe(1)
    expect(stats.hitQualityReceived['Hits']).toBe(1)
  })

  it('calculates activeTimeMinutes', () => {
    const stats = computeStats(entries)
    // entries span ts1 (first) to ts2 (last entry in array) = 1 minute
    expect(stats.activeTimeMinutes).toBe(1)
  })

  it('returns zero activeTimeMinutes for < 2 entries', () => {
    const stats = computeStats([entries[0]])
    expect(stats.activeTimeMinutes).toBe(0)
  })
})

// ────────────────────────────────────────────────────────────
// computeStats — damageDealtByTarget
// ────────────────────────────────────────────────────────────
describe('computeStats — damageDealtByTarget', () => {
  const ts = new Date('2025-10-23T02:08:00')

  it('groups damage-dealt entries by target and aggregates correctly', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-dealt',
        amount: 400,
        pilotName: 'Pilot Alpha',
        shipType: 'Typhoon',
        corpTicker: 'TGRAD',
      },
      {
        id: '2',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-dealt',
        amount: 200,
        pilotName: 'Pilot Alpha',
        shipType: 'Typhoon',
        corpTicker: 'TGRAD',
      },
      {
        id: '3',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-dealt',
        amount: 300,
        pilotName: 'Pilot Beta',
        shipType: 'Brutix',
        corpTicker: 'TEST',
      },
    ]

    const stats = computeStats(entries)
    expect(stats.damageDealtByTarget).toHaveLength(2)

    // Sorted by totalDamage desc: Alpha (600) before Beta (300)
    expect(stats.damageDealtByTarget[0].target).toBe('Pilot Alpha')
    expect(stats.damageDealtByTarget[0].shipType).toBe('Typhoon')
    expect(stats.damageDealtByTarget[0].totalDamage).toBe(600)
    expect(stats.damageDealtByTarget[0].hitCount).toBe(2)

    expect(stats.damageDealtByTarget[1].target).toBe('Pilot Beta')
    expect(stats.damageDealtByTarget[1].shipType).toBe('Brutix')
    expect(stats.damageDealtByTarget[1].totalDamage).toBe(300)
    expect(stats.damageDealtByTarget[1].hitCount).toBe(1)
  })
})

// ────────────────────────────────────────────────────────────
// computeStats — repReceivedBySource
// ────────────────────────────────────────────────────────────
describe('computeStats — repReceivedBySource', () => {
  const ts = new Date('2025-10-23T02:08:00')

  it('flags isBot correctly for rep-received entries', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        timestamp: ts,
        rawLine: '',
        eventType: 'rep-received',
        amount: 256,
        repShipType: 'Vedmak',
        repModule: 'Medium Remote Armor Repairer II',
        isRepBot: false,
      },
      {
        id: '2',
        timestamp: ts,
        rawLine: '',
        eventType: 'rep-received',
        amount: 120,
        repShipType: 'Medium Armor Maintenance Bot I',
        repModule: 'Medium Armor Maintenance Bot I',
        isRepBot: true,
      },
    ]

    const stats = computeStats(entries)
    expect(stats.repReceivedBySource).toHaveLength(2)

    // Sorted by total desc: Vedmak (256) before bot (120)
    const vedmak = stats.repReceivedBySource.find(r => r.shipType === 'Vedmak')
    expect(vedmak).toBeDefined()
    expect(vedmak!.isBot).toBe(false)
    expect(vedmak!.total).toBe(256)
    expect(vedmak!.hitCount).toBe(1)

    const bot = stats.repReceivedBySource.find(r => r.shipType === 'Medium Armor Maintenance Bot I')
    expect(bot).toBeDefined()
    expect(bot!.isBot).toBe(true)
    expect(bot!.total).toBe(120)
  })
})

// ────────────────────────────────────────────────────────────
// computeStats — capReceivedByShipType
// ────────────────────────────────────────────────────────────
describe('computeStats — capReceivedByShipType', () => {
  const ts = new Date('2025-10-23T02:08:00')

  it('aggregates neut-received entries by capShipType', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        timestamp: ts,
        rawLine: '',
        eventType: 'neut-received',
        capAmount: 438,
        capShipType: 'Typhoon',
        capModule: 'Heavy Energy Neutralizer II',
        capEventType: 'neut-received',
      },
      {
        id: '2',
        timestamp: ts,
        rawLine: '',
        eventType: 'neut-received',
        capAmount: 200,
        capShipType: 'Typhoon',
        capModule: 'Heavy Energy Neutralizer II',
        capEventType: 'neut-received',
      },
    ]

    const stats = computeStats(entries)
    expect(stats.capReceivedByShipType).toHaveLength(1)
    expect(stats.capReceivedByShipType[0].shipType).toBe('Typhoon')
    expect(stats.capReceivedByShipType[0].totalGj).toBe(638)
    expect(stats.capReceivedByShipType[0].hitCount).toBe(2)
  })
})

// ────────────────────────────────────────────────────────────
// computeStats — capDealtByModule (nos-dealt zeroHits)
// ────────────────────────────────────────────────────────────
describe('computeStats — capDealtByModule', () => {
  const ts = new Date('2025-10-23T02:08:00')

  it('counts zeroHits for nos-dealt with capAmount = 0', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        timestamp: ts,
        rawLine: '',
        eventType: 'nos-dealt',
        capAmount: 0,
        capShipType: 'Brutix Navy Issue',
        capModule: 'Medium Energy Nosferatu II',
        capEventType: 'nos-dealt',
      },
    ]

    const stats = computeStats(entries)
    expect(stats.capDealtByModule).toHaveLength(1)
    expect(stats.capDealtByModule[0].module).toBe('Medium Energy Nosferatu II')
    expect(stats.capDealtByModule[0].eventType).toBe('nos-dealt')
    expect(stats.capDealtByModule[0].totalGj).toBe(0)
    expect(stats.capDealtByModule[0].hitCount).toBe(1)
    expect(stats.capDealtByModule[0].zeroHits).toBe(1)
  })
})

// ────────────────────────────────────────────────────────────
// filterOutHostileNpcs
// ────────────────────────────────────────────────────────────
describe('filterOutHostileNpcs', () => {
  const ts = new Date('2026-02-19T05:33:16')

  it('filters out Centatis Wraith from log entries', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-received',
        amount: 50,
        shipType: 'Centatis Wraith',
        weapon: 'Nova Rocket',
        hitQuality: 'Hits',
        isNpc: true,
      },
      {
        id: '2',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-dealt',
        amount: 100,
        pilotName: 'Player One',
        shipType: 'Typhoon',
        weapon: 'Heavy Entropic Disintegrator II',
        hitQuality: 'Hits',
        isNpc: false,
      },
    ]
    const filtered = filterOutHostileNpcs(entries)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].pilotName).toBe('Player One')
  })

  it('filters out Centatis Daemon from log entries', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-received',
        amount: 75,
        shipType: 'Centatis Daemon',
        weapon: 'Nova Heavy Missile',
        hitQuality: 'Penetrates',
        isNpc: true,
      },
      {
        id: '2',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-dealt',
        amount: 100,
        pilotName: 'Player One',
        shipType: 'Typhoon',
        weapon: 'Heavy Entropic Disintegrator II',
        hitQuality: 'Hits',
        isNpc: false,
      },
    ]
    const filtered = filterOutHostileNpcs(entries)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].pilotName).toBe('Player One')
  })

  it('filters out Centus Tyrant from log entries', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-received',
        amount: 120,
        shipType: 'Centus Tyrant',
        weapon: 'Nova Cruise Missile',
        hitQuality: 'Smashes',
        isNpc: true,
      },
      {
        id: '2',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-dealt',
        amount: 100,
        pilotName: 'Player One',
        shipType: 'Typhoon',
        weapon: 'Heavy Entropic Disintegrator II',
        hitQuality: 'Hits',
        isNpc: false,
      },
    ]
    const filtered = filterOutHostileNpcs(entries)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].pilotName).toBe('Player One')
  })

  it('filters out Centus Dread Lord from log entries', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-received',
        amount: 200,
        shipType: 'Centus Dread Lord',
        weapon: 'Caldari Navy Mjolnir Heavy Missile',
        hitQuality: 'Wrecks',
        isNpc: true,
      },
      {
        id: '2',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-dealt',
        amount: 100,
        pilotName: 'Player One',
        shipType: 'Typhoon',
        weapon: 'Heavy Entropic Disintegrator II',
        hitQuality: 'Hits',
        isNpc: false,
      },
    ]
    const filtered = filterOutHostileNpcs(entries)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].pilotName).toBe('Player One')
  })

  it('filters out Centatis Behemoth from log entries', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-received',
        amount: 300,
        shipType: 'Centatis Behemoth',
        hitQuality: 'Grazes',
        isNpc: true,
      },
      {
        id: '2',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-dealt',
        amount: 100,
        pilotName: 'Player One',
        shipType: 'Typhoon',
        weapon: 'Heavy Entropic Disintegrator II',
        hitQuality: 'Hits',
        isNpc: false,
      },
    ]
    const filtered = filterOutHostileNpcs(entries)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].pilotName).toBe('Player One')
  })

  it('filters out Centatis Devil from log entries', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-received',
        amount: 150,
        shipType: 'Centatis Devil',
        weapon: 'Heavy Entropic Disintegrator II',
        hitQuality: 'Hits',
        isNpc: true,
      },
      {
        id: '2',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-dealt',
        amount: 100,
        pilotName: 'Player One',
        shipType: 'Typhoon',
        weapon: 'Heavy Entropic Disintegrator II',
        hitQuality: 'Hits',
        isNpc: false,
      },
    ]
    const filtered = filterOutHostileNpcs(entries)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].pilotName).toBe('Player One')
  })

  it('filters out Sansha\'s Horror from log entries', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-received',
        amount: 250,
        shipType: 'Sansha\'s Horror',
        weapon: 'Dual Heavy Pulse Laser II',
        hitQuality: 'Penetrates',
        isNpc: true,
      },
      {
        id: '2',
        timestamp: ts,
        rawLine: '',
        eventType: 'damage-dealt',
        amount: 100,
        pilotName: 'Player One',
        shipType: 'Typhoon',
        weapon: 'Heavy Entropic Disintegrator II',
        hitQuality: 'Hits',
        isNpc: false,
      },
    ]
    const filtered = filterOutHostileNpcs(entries)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].pilotName).toBe('Player One')
  })
})
