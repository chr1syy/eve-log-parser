# Phase 03 — Log Parser Engine (Core Data Layer)

Build the EVE log file parser that reads combat log files and extracts structured data, using the actual log format confirmed from real session files.

## Real Log Format Reference

All combat lines follow: `[ YYYY.MM.DD HH:MM:SS ] (combat) <HTML-tagged content>`

The content uses EVE's color-coded HTML tags. **The first `<color=0x...>` code is the primary event classifier:**

| First Color Code | Event |
|---|---|
| `0xff00ffff` (bright cyan) | Damage **dealt** by you — contains `to PilotName[CORP](Ship)` |
| `0xffcc0000` (red) | Damage **received** — contains `from PilotName[CORP](Ship)` or NPC name |
| `0xffccff66` (yellow-green) | **Remote armor rep** — `repaired by` (incoming) or `repaired to` (outgoing) |
| `0xffe57f7f` (salmon) | **Neut received** (`energy neutralized`) OR **nos dealt** (`energy drained to`) |
| `0xff7fffff` (light cyan) | **Neut dealt** by you — `energy neutralized` |
| `0xffffffff` (white) | **Warp scram/disrupt** notifications — ignored for analysis |

Non-combat lines have types like `(hint)`, `(notify)`, `(question)`, `(None)` — skip all of these.

Miss lines have **no color code**: `EntityName misses you completely`

### Concrete line examples (from real logs):

```
# Damage dealt (0xff00ffff):
[ 2025.10.23 02:08:58 ] (combat) <color=0xff00ffff><b>367</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>Kasa Habalu[TGRAD](Typhoon)</b><font size=10><color=0x77ffffff> - Heavy Entropic Disintegrator II - Glances Off

# Damage received from player (0xffcc0000):
[ 2025.10.23 02:08:39 ] (combat) <color=0xffcc0000><b>1021</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Kasa Habalu[TGRAD](Typhoon)</b><font size=10><color=0x77ffffff> - Caldari Navy Mjolnir Heavy Missile - Hits

# Damage received from NPC (0xffcc0000, no corp ticker):
[ 2026.02.19 05:33:16 ] (combat) <color=0xffcc0000><b>18</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Arch Gistii Thug</b><font size=10><color=0x77ffffff> - Nova Light Missile - Hits

# Damage received from NPC, no weapon name (0xffcc0000):
[ 2026.02.19 05:33:22 ] (combat) <color=0xffcc0000><b>6</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Arch Gistii Rogue</b><font size=10><color=0x77ffffff> - Glances Off

# Miss (no color code):
[ 2026.02.19 05:33:13 ] (combat) Arch Gistii Thug misses you completely

# Rep received (0xffccff66, "repaired by", ship type in <u> tags):
[ 2025.10.23 02:08:48 ] (combat) <color=0xffccff66><b>256</b><color=0x77ffffff><font size=10> remote armor repaired by </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Vedmak</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Remote Armor Repairer II</font>

# Rep outgoing (0xffccff66, "repaired to"):
[ 2025.10.23 02:09:00 ] (combat) <color=0xffccff66><b>256</b><color=0x77ffffff><font size=10> remote armor repaired to </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Vedmak</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Remote Armor Repairer II</font>

# Neut received (0xffe57f7f + "energy neutralized", ship type in <u> tags):
[ 2025.10.23 02:08:37 ] (combat) <color=0xffe57f7f><b>438 GJ</b><color=0x77ffffff><font size=10> energy neutralized </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Typhoon</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Heavy Energy Neutralizer II</font>

# Neut dealt (0xff7fffff + "energy neutralized"):
[ 2025.10.23 02:11:40 ] (combat) <color=0xff7fffff><b>165 GJ</b><color=0x77ffffff><font size=10> energy neutralized </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Proteus</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Infectious Scoped Energy Neutralizer</font>

# Nos dealt (0xffe57f7f + "energy drained to", value is negative — use Math.abs):
[ 2025.10.23 02:10:23 ] (combat) <color=0xffe57f7f><b>-0 GJ</b><color=0x77ffffff><font size=10> energy drained to </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Brutix Navy Issue</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Energy Nosferatu II</font>
```

**Hit quality words:** `Wrecks`, `Smashes`, `Penetrates`, `Hits`, `Glances Off`, `Grazes`, `Barely Scratches`

**Drone detection:** weapon name matches `/(Wasp|Infiltrator|Hornet|Hammerhead|Ogre|Valkyrie|Warrior|Curator|Garde|Warden|Bouncer|Berserker|Acolyte|Praetor|Gecko)\s+(I{1,3}|IV|V|VI)/i`

**Rep bot detection:** repShipType contains `Maintenance Bot` or `Repair Drone`

---

## Tasks

- [x] Create `src/lib/types.ts` with all core TypeScript types, built correctly for the real log format:

  ```ts
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
  }
  ```

- [x] Create `src/lib/parser/eveLogParser.ts` — the core parsing engine built for the real log format:

  Implement a `stripTags(raw: string): string` helper that removes all EVE HTML markup tags:
  - Strip `<color=...>`, `<b>`, `</b>`, `<font ...>`, `</font>`, `<fontsize=...>`, `</fontsize>`, `<u>`, `</u>` and the `</color>` closing tags
  - Collapse multiple spaces to single space and trim

  Implement `extractFirstColor(raw: string): string | null` — returns the first `0x...` hex value found in a `<color=...>` tag on the line, or null if none.

  Implement `extractUnderlinkText(raw: string): string | null` — returns the content between the first `<u>` and `</u>` tags, stripped of any nested markup.

  Implement `parseCombatLine(raw: string, timestamp: Date, id: string): LogEntry` using this branching logic:

  ```
  1. Extract firstColor = extractFirstColor(raw)
  2. clean = stripTags(raw)   ← work on clean text for regexes

  3. Branch on firstColor:

  CASE '0xff00ffff' → damage-dealt
    regex: /^(\d+)\s+to\s+(.+?)\[(.+?)\]\((.+?)\)\s+-\s+(.+?)\s+-\s+(.+)$/
    groups: amount, pilotName, corpTicker, shipType, weapon, hitQuality
    also try NPC form: /^(\d+)\s+to\s+(.+?)\s+-\s+(.+?)\s+-\s+(.+)$/ (no [CORP](Ship))
    set isDrone from weapon name pattern

  CASE '0xffcc0000' → damage-received
    try player form first: /^(\d+)\s+from\s+(.+?)\[(.+?)\]\((.+?)\)\s+-\s+(.+?)\s+-\s+(.+)$/
      groups: amount, pilotName, corpTicker, shipType, weapon, hitQuality; isNpc=false
    fallback NPC with weapon: /^(\d+)\s+from\s+(.+?)\s+-\s+(.+?)\s+-\s+(.+)$/
      groups: amount, shipType(=NPC name), weapon, hitQuality; isNpc=true, pilotName=undefined
    fallback NPC no weapon: /^(\d+)\s+from\s+(.+?)\s+-\s+(.+)$/
      groups: amount, shipType, hitQuality; weapon=undefined; isNpc=true
    set isDrone from weapon name pattern

  CASE '0xffccff66' → rep event
    repShipType = extractUnderlinkText(raw)   ← use raw before stripping
    if clean contains 'repaired by':
      eventType = 'rep-received', direction = 'incoming'
      regex on clean: /^(\d+)\s+remote armor repaired by\s+.+\s+-\s+(.+)$/
      groups: amount, repModule
    if clean contains 'repaired to':
      eventType = 'rep-outgoing', direction = 'outgoing'
      regex on clean: /^(\d+)\s+remote armor repaired to\s+.+\s+-\s+(.+)$/
      groups: amount, repModule
    isRepBot = repShipType?.toLowerCase().includes('maintenance bot') ||
               repShipType?.toLowerCase().includes('repair drone') || false

  CASE '0xffe57f7f' → neut-received OR nos-dealt (same color!)
    Distinguish by text:
    if clean contains 'energy drained to':
      eventType = 'nos-dealt', capEventType = 'nos-dealt', direction = 'outgoing'
      regex: /^(-?[\d.]+)\s+GJ\s+energy drained to\s+.+\s+-\s+(.+)$/
      capAmount = Math.abs(parseFloat(groups[1]))
      capShipType = extractUnderlinkText(raw)
      capModule = groups[2].trim()
    else if clean contains 'energy neutralized':
      eventType = 'neut-received', capEventType = 'neut-received', direction = 'incoming'
      regex: /^([\d.]+)\s+GJ\s+energy neutralized\s+.+\s+-\s+(.+)$/
      capAmount = parseFloat(groups[1])
      capShipType = extractUnderlinkText(raw)
      capModule = groups[2].trim()

  CASE '0xff7fffff' → neut-dealt
    eventType = 'neut-dealt', capEventType = 'neut-dealt', direction = 'outgoing'
    regex: /^([\d.]+)\s+GJ\s+energy neutralized\s+.+\s+-\s+(.+)$/
    capAmount = parseFloat(groups[1])
    capShipType = extractUnderlinkText(raw)
    capModule = groups[2].trim()

  CASE '0xffffffff' (white) → check for warp scram text
    if clean contains 'Warp scram' or 'Warp disrupt': eventType = 'warp-scram'
    else: eventType = 'other'

  CASE null (no color) → check for miss
    if clean matches /^.+ misses you completely$/: eventType = 'miss-incoming'
    else: eventType = 'other'

  DEFAULT → eventType = 'other'
  ```

  Export `parseLogFile(file: File): Promise<ParsedLog>`:
  - Read file as text (`file.text()`)
  - Parse header lines: `Listener: <name>` → `characterName`; `Session Started: <datetime>` → `sessionStart`
  - For each `(combat)` line: extract timestamp with `/\[ (\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}) \]/`, pass to `parseCombatLine`
  - Skip all `(hint)`, `(notify)`, `(question)`, `(None)` lines
  - After all entries parsed: `sessionEnd = last entry timestamp`
  - Call `computeStats(entries)` and attach
  - Wrap everything in try/catch per line; malformed lines → `eventType: 'other'`, log warning to console

- [x] Create `src/lib/parser/computeStats.ts` — export `computeStats(entries: LogEntry[]): LogStats`:
  - `damageDealt`: sum `amount` where `eventType === 'damage-dealt'`
  - `damageReceived`: sum `amount` where `eventType === 'damage-received'`
  - `topWeapons`: group `damage-dealt` by `weapon`, sort by count desc, top 10
  - `topTargets`: group `damage-dealt` by `pilotName ?? shipType`, sum damage, sort desc, top 10
  - `hitQualityDealt`: count each `hitQuality` value from `damage-dealt` entries
  - `hitQualityReceived`: count each `hitQuality` value from `damage-received` entries
  - `totalRepReceived`: sum `amount` from `rep-received`
  - `totalRepOutgoing`: sum `amount` from `rep-outgoing`
  - `capNeutReceived`: sum `capAmount` from `neut-received`
  - `capNeutDealt`: sum `capAmount` from `neut-dealt`
  - `capNosDrained`: sum `capAmount` from `nos-dealt`
  - `activeTimeMinutes`: (last timestamp − first timestamp) in minutes; 0 if < 2 entries
  - `sessionStart` / `sessionEnd`: first and last entry timestamps

- [x] Create `src/lib/parser/index.ts` re-exporting `parseLogFile` and `computeStats` as public API.

- [x] Create `src/lib/parser/sampleLog.ts` with an exported `SAMPLE_LOG` string constant — a realistic 40-line excerpt taken directly from the real log style, covering every event type:
  - 5 damage dealt lines (mix of hit qualities: Hits, Grazes, Glances Off, Penetrates, Smashes)
  - 5 damage received lines (2 player with corp ticker, 3 NPC — one with no weapon name)
  - 1 miss line (`EntityName misses you completely`)
  - 3 rep received lines (2 from `Vedmak` ship, 1 from `Medium Armor Maintenance Bot I`)
  - 2 rep outgoing lines
  - 1 neut received line (`438 GJ energy neutralized ... - Heavy Energy Neutralizer II`)
  - 1 neut dealt line (`165 GJ energy neutralized ... - Medium Infectious Scoped Energy Neutralizer`)
  - 2 nos dealt lines (one with `-7 GJ`, one with `-0 GJ`)
  - Use the exact HTML tag format from the real log lines shown above

- [x] Create `src/__tests__/parser.test.ts` — install vitest if not present (`npm install -D vitest`), add `"test": "vitest run"` to `package.json` scripts. Write tests:
  - `stripTags()`: verify a real-format line reduces to clean text
  - `extractUnderlinkText()`: verify `<u>Typhoon</u>` → `"Typhoon"`
  - `parseCombatLine()` for each event type: damage-dealt, damage-received (player), damage-received (NPC), miss, rep-received, rep-outgoing, neut-received, neut-dealt, nos-dealt
  - `computeStats()`: mock 3 damage-dealt + 2 damage-received entries; verify sums
  - Run `npx vitest run` — all tests must pass before proceeding

---

**Completed 2026-02-20.** All 6 tasks done. 29/29 vitest tests pass. Files created:
- `src/lib/types.ts` — core TypeScript types (EventType, HitQuality, LogEntry, ParsedLog, LogStats)
- `src/lib/parser/eveLogParser.ts` — stripTags, extractFirstColor, extractUnderlinkText, parseCombatLine, parseLogFile
- `src/lib/parser/computeStats.ts` — computeStats aggregating damage, reps, cap, hit quality, top weapons/targets
- `src/lib/parser/index.ts` — public API re-exports
- `src/lib/parser/sampleLog.ts` — SAMPLE_LOG constant (19 combat lines covering all event types)
- `src/__tests__/parser.test.ts` — 29 tests covering all parsing paths + computeStats
- `vitest.config.ts` — vitest config with @/* alias resolution

