# Phase 10 — Integration Tests Against Real Log Files

Run the parser and all analysis functions against the two real EVE log files in the project root. Every assertion below is derived from counting actual lines in those files — these are ground-truth values, not estimates.

## Real Log File Facts (confirmed by grep)

### `20251023_013333_151402274.txt` (referred to as **Log A**)

- Listener: `Bungo Brown` / Session started: `2025.10.23 01:33:33`
- Combat lines: **1944** total
- Damage dealt (`0xff00ffff`): **242** lines — weapons: `Heavy Entropic Disintegrator II`, `Acolyte II`
- Damage received (`0xffcc0000`): **793** lines — attackers: `Kasa Habalu[TGRAD](Typhoon)`, `Hanim Kun Samisa[P.INS](Drake)`, `Macgunner Tivianne[YAGAS](Proteus)`, `HenrySolo[P.INS](Brutix Navy Issue)`, `Kuikkatoh Kun Saisima[P.INS](Brutix Navy Issue)`, `Tafith Kun Samisa[P.INS](Drake)` — weapons include `Wasp II`, `Hammerhead II`, `Hobgoblin II` (drones), `Caldari Navy Mjolnir Heavy Missile`, `Dual 150mm Railgun II`, `Heavy Neutron Blaster II`
- Misses: **68** lines
- Rep received (`repaired by`): **562** lines — sources: `Vedmak` (ship), `Medium Armor Maintenance Bot I` (bot)
- Rep outgoing (`repaired to`): **150** lines
- Neut received (`0xffe57f7f` + `energy neutralized`): **2** lines — module: `Heavy Energy Neutralizer II`, 438 GJ each
- Neut dealt (`0xff7fffff` + `energy neutralized`): **15** lines — module: `Medium Infectious Scoped Energy Neutralizer`, 165 GJ each (except 1 partial hit at 11 GJ)
- Nos dealt (`0xffe57f7f` + `energy drained to`): **99** lines — modules: `Medium Energy Nosferatu II`, `Small Energy Nosferatu II`; many are `-0 GJ` (zero-GJ hits)

### `20260219_045352_151402274.txt` (referred to as **Log B**)

- Listener: `Bungo Brown` / Session started: `2026.02.19 04:53:52`
- Combat lines: **1330** total
- Damage dealt (`0xff00ffff`): **499** lines — weapons: `Medium Breacher Pod Launcher`, `Infiltrator II` (drone)
- Damage received (`0xffcc0000`): **512** lines — attackers include players (`Diana Wanda[P.L.A](Ishtar)`, `Anakin Force[P.L.A](Brutix)`, `zake yi[P.L.A](Ishtar)`, `Forever Force[P.L.A](Ishtar)`, `Skywalker Force[P.L.A](Ishtar)`, `Erolissi Merr[P.L.A](Ferox Navy Issue)`, `Solusek Burn[P.L.A](Huginn)`) and NPCs (`Arch Gistii Thug`, `Arch Gistii Rogue`, `Arch Gistii Hijacker`, `Gist Cherubim`); 145 NPC lines have **no weapon name** (bare `- HitQuality` only)
- Misses: **255** lines
- Rep received: **0**
- Rep outgoing: **0**
- Neut received: **0**
- Neut dealt: **0**
- Nos dealt: **0**

---

## Tasks

- [x] Create `src/__tests__/integration/logA.test.ts` — integration tests for Log A (`20251023_013333_151402274.txt`).

  **Completed:** Created integration test file with 48 test assertions covering:
  - Parser header extraction (character name, session start, basic parsing)
  - Event type counts (damage-dealt: 242, damage-received: 793, miss-incoming: 68, rep-received: 562, rep-outgoing: 150, neut-received: 2, neut-dealt: 15, nos-dealt: 99)
  - Damage dealt fields (drone identification, weapon damage, pilot/corp extraction, hit quality parsing)
  - Damage received fields (player attacker fields, drone identification, positive amounts)
  - Rep fields (bot identification, ship identification, module fields, direction)
  - Cap fields (neut-received amounts, module identification, nos-dealt zero-GJ handling)
  - computeStats validation (damage sums, rep sums, cap sums, active time)
  - Analysis functions (damage dealt, damage taken, reps, cap pressure)

  **Fix applied:** Updated `eveLogParser.ts` line 243 to fix miss-incoming detection regex from `/^.+ misses you completely$/` to `/^.+ misses you completely/` (removed end-of-line anchor) to handle miss lines with optional weapon suffixes.

  All 48 tests pass.

  The test file must read the log using Node's `fs.readFileSync` and create a synthetic `File` object (since `parseLogFile` accepts a `File`):

  ```ts
  import { readFileSync } from "fs";
  import { resolve } from "path";
  import { describe, it, expect, beforeAll } from "vitest";
  import { parseLogFile } from "../../lib/parser";
  import { analyzeDamageDealt } from "../../lib/analysis/damageDealt";
  import { analyzeDamageTaken } from "../../lib/analysis/damageTaken";
  import { analyzeReps } from "../../lib/analysis/repAnalysis";
  import { analyzeCapPressure } from "../../lib/analysis/capAnalysis";
  import type { ParsedLog } from "../../lib/types";

  // Helper: create a File from disk path
  function fileFromDisk(filePath: string): File {
    const buffer = readFileSync(filePath);
    const blob = new Blob([buffer], { type: "text/plain" });
    return new File([blob], filePath.split("/").pop()!, { type: "text/plain" });
  }

  const LOG_A_PATH = resolve(
    __dirname,
    "../../../20251023_013333_151402274.txt",
  );

  let parsed: ParsedLog;

  beforeAll(async () => {
    parsed = await parseLogFile(fileFromDisk(LOG_A_PATH));
  });
  ```

  Write the following `describe` blocks and `it` assertions:

  **`describe('Log A — Parser header')`**
  - `it('extracts character name')` → `expect(parsed.characterName).toBe('Bungo Brown')`
  - `it('extracts session start')` → `expect(parsed.sessionStart?.getFullYear()).toBe(2025)`
  - `it('parses without throwing')` → `expect(parsed.entries.length).toBeGreaterThan(0)`

  **`describe('Log A — Event type counts')`**
  - `it('counts damage-dealt entries')` → `expect(parsed.entries.filter(e => e.eventType === 'damage-dealt').length).toBe(242)`
  - `it('counts damage-received entries')` → `expect(parsed.entries.filter(e => e.eventType === 'damage-received').length).toBe(793)`
  - `it('counts miss-incoming entries')` → `expect(parsed.entries.filter(e => e.eventType === 'miss-incoming').length).toBe(68)`
  - `it('counts rep-received entries')` → `expect(parsed.entries.filter(e => e.eventType === 'rep-received').length).toBe(562)`
  - `it('counts rep-outgoing entries')` → `expect(parsed.entries.filter(e => e.eventType === 'rep-outgoing').length).toBe(150)`
  - `it('counts neut-received entries')` → `expect(parsed.entries.filter(e => e.eventType === 'neut-received').length).toBe(2)`
  - `it('counts neut-dealt entries')` → `expect(parsed.entries.filter(e => e.eventType === 'neut-dealt').length).toBe(15)`
  - `it('counts nos-dealt entries')` → `expect(parsed.entries.filter(e => e.eventType === 'nos-dealt').length).toBe(99)`

  **`describe('Log A — Damage dealt fields')`**
  - `it('identifies drone damage')` → `const droneHits = parsed.entries.filter(e => e.eventType === 'damage-dealt' && e.isDrone); expect(droneHits.length).toBeGreaterThan(0); droneHits.forEach(e => expect(e.weapon).toMatch(/Acolyte/i))`
  - `it('identifies turret/weapon damage')` → `const weaponHits = parsed.entries.filter(e => e.eventType === 'damage-dealt' && !e.isDrone); weaponHits.forEach(e => expect(e.weapon).toMatch(/Heavy Entropic Disintegrator II/))`
  - `it('extracts pilot name and corp from damage-dealt')` → find a dealt entry targeting Typhoon; `expect(e.pilotName).toBe('Kasa Habalu'); expect(e.corpTicker).toBe('TGRAD'); expect(e.shipType).toBe('Typhoon')`
  - `it('parses hit quality on damage-dealt entries')` → `const withQuality = parsed.entries.filter(e => e.eventType === 'damage-dealt' && e.hitQuality && e.hitQuality !== 'unknown'); expect(withQuality.length).toBeGreaterThan(0)`

  **`describe('Log A — Damage received fields')`**
  - `it('extracts pilot, corp, ship from player attacker')` → find a `damage-received` entry from Kasa Habalu; `expect(e.pilotName).toBe('Kasa Habalu'); expect(e.corpTicker).toBe('TGRAD'); expect(e.shipType).toBe('Typhoon'); expect(e.isNpc).toBe(false)`
  - `it('identifies incoming drone hits')` → `const droneDmg = parsed.entries.filter(e => e.eventType === 'damage-received' && e.isDrone); expect(droneDmg.length).toBeGreaterThan(0)`
  - `it('all damage-received entries have a positive amount')` → `parsed.entries.filter(e => e.eventType === 'damage-received').forEach(e => expect(e.amount).toBeGreaterThanOrEqual(0))`

  **`describe('Log A — Rep fields')`**
  - `it('identifies rep bots')` → `const botReps = parsed.entries.filter(e => e.eventType === 'rep-received' && e.isRepBot); expect(botReps.length).toBeGreaterThan(0); botReps.forEach(e => expect(e.repShipType).toMatch(/Maintenance Bot/i))`
  - `it('identifies ship reps (non-bot)')` → `const shipReps = parsed.entries.filter(e => e.eventType === 'rep-received' && !e.isRepBot); expect(shipReps.length).toBeGreaterThan(0); shipReps.forEach(e => expect(e.repShipType).toBe('Vedmak'))`
  - `it('rep-received entries have repModule set')` → `parsed.entries.filter(e => e.eventType === 'rep-received').forEach(e => expect(e.repModule).toBeTruthy())`
  - `it('rep-outgoing entries have direction outgoing')` → `parsed.entries.filter(e => e.eventType === 'rep-outgoing').forEach(e => expect(e.direction).toBe('outgoing'))`

  **`describe('Log A — Cap fields')`**
  - `it('neut-received entries have correct capAmount')` → `parsed.entries.filter(e => e.eventType === 'neut-received').forEach(e => { expect(e.capAmount).toBe(438); expect(e.capModule).toBe('Heavy Energy Neutralizer II'); expect(e.capShipType).toBe('Typhoon') })`
  - `it('neut-dealt entries have capModule set')` → `parsed.entries.filter(e => e.eventType === 'neut-dealt').forEach(e => expect(e.capModule).toBe('Medium Infectious Scoped Energy Neutralizer'))`
  - `it('nos-dealt entries have non-negative capAmount')` → `parsed.entries.filter(e => e.eventType === 'nos-dealt').forEach(e => expect(e.capAmount).toBeGreaterThanOrEqual(0))`
  - `it('nos-dealt zero-GJ hits have capAmount 0')` → `const zeros = parsed.entries.filter(e => e.eventType === 'nos-dealt' && e.capAmount === 0); expect(zeros.length).toBeGreaterThan(0)`

  **`describe('Log A — computeStats')`**
  - `it('stats.damageDealt matches sum of dealt entries')` → sum amounts manually, compare to `parsed.stats.damageDealt`
  - `it('stats.damageReceived matches sum of received entries')` → same pattern
  - `it('stats.totalRepReceived matches sum of rep-received amounts')` → sum and compare
  - `it('stats.capNeutReceived is 876')` → `expect(parsed.stats.capNeutReceived).toBe(876)` (2 hits × 438 GJ)
  - `it('stats.capNeutDealt is correct')` → sum neut-dealt capAmounts and compare to `parsed.stats.capNeutDealt`
  - `it('stats.activeTimeMinutes is positive')` → `expect(parsed.stats.activeTimeMinutes).toBeGreaterThan(0)`

  **`describe('Log A — analyzeDamageDealt')`**
  - `it('returns engagements for each target')` → `const analysis = analyzeDamageDealt(parsed.entries); expect(analysis.engagements.length).toBeGreaterThan(0)`
  - `it('separates drone summaries from weapon summaries')` → `expect(analysis.droneSummaries.some(s => s.weapon.match(/Acolyte/i))).toBe(true); expect(analysis.weaponSummaries.some(s => s.weapon.match(/Heavy Entropic Disintegrator/i))).toBe(true)`
  - `it('total damage across all engagements equals totalDamageDealt')` → `const engTotal = analysis.engagements.reduce((s, e) => s + e.totalDamage, 0); expect(engTotal).toBe(analysis.totalDamageDealt)`
  - `it('all engagements have windowSeconds >= 0')` → `analysis.engagements.forEach(e => expect(e.windowSeconds).toBeGreaterThanOrEqual(0))`

  **`describe('Log A — analyzeDamageTaken')`**
  - `it('totalDamageReceived matches stats.damageReceived')` → `const dt = analyzeDamageTaken(parsed.entries); expect(dt.totalDamageReceived).toBe(parsed.stats.damageReceived)`
  - `it('detects at least one fight segment')` → `expect(dt.fights.length).toBeGreaterThan(0)`
  - `it('peakDps10s.maxDps is positive')` → `expect(dt.peakDps10s.maxDps).toBeGreaterThan(0)`
  - `it('separates incoming drone summaries')` → `expect(dt.incomingDroneSummaries.length).toBeGreaterThan(0)`

  **`describe('Log A — analyzeReps')`**
  - `it('totalRepReceived matches stats.totalRepReceived')` → `const reps = analyzeReps(parsed.entries); expect(reps.totalRepReceived).toBe(parsed.stats.totalRepReceived)`
  - `it('identifies rep bots separately')` → `expect(reps.repReceivedByBots.length).toBeGreaterThan(0); expect(reps.repReceivedByBots[0].isBot).toBe(true)`
  - `it('identifies Vedmak as a ship repper')` → `expect(reps.repReceivedByShips.some(s => s.shipType === 'Vedmak')).toBe(true)`
  - `it('totalRepOutgoing is positive')` → `expect(reps.totalRepOutgoing).toBeGreaterThan(0)`

  **`describe('Log A — analyzeCapPressure')`**
  - `it('totalGjNeutReceived is 876')` → `const cap = analyzeCapPressure(parsed.entries); expect(cap.totalGjNeutReceived).toBe(876)`
  - `it('incomingByShipType contains Typhoon')` → `expect(cap.incomingByShipType.some(s => s.shipType === 'Typhoon')).toBe(true)`
  - `it('outgoingModuleSummaries contains Medium Infectious Scoped Energy Neutralizer')` → `expect(cap.outgoingModuleSummaries.some(m => m.module === 'Medium Infectious Scoped Energy Neutralizer')).toBe(true)`
  - `it('nos-dealt zeroHits is greater than 0')` → `const nosSummary = cap.outgoingModuleSummaries.find(m => m.eventType === 'nos-dealt'); expect(nosSummary?.zeroHits).toBeGreaterThan(0)`

  Run `npx vitest run src/__tests__/integration/logA.test.ts` — all tests must pass.

- [x] Create `src/__tests__/integration/logB.test.ts` — integration tests for Log B (`20260219_045352_151402274.txt`).

  **Completed:** Created integration test file with 23 test assertions covering:
  - Parser header extraction (character name, session start year 2026)
  - Event type counts (damage-dealt: 499, damage-received: 512, miss-incoming: 255, zero rep/neut/nos events)
  - NPC damage handling (isNpc flag, hitQuality without weapon, no corpTicker, Gist Cherubim identification)
  - Damage dealt fields (Infiltrator II drone identification, Medium Breacher Pod Launcher non-drone, Diana Wanda targeting)
  - analyzeReps zero reps validation (totalRepReceived: 0, empty repReceivedSources)
  - analyzeCapPressure zero cap validation (totalGjNeutReceived: 0, totalGjOutgoing: 0, empty neutReceivedTimeline)
  - analyzeDamageTaken validation (positive totalDamageReceived, incoming drone detection, positive peakDps30s)

  All 23 tests pass.

- [x] Create `src/__tests__/integration/crossLog.test.ts` — tests that run both logs and compare/validate cross-log properties:

  **Completed:** Created integration test file with 13 test assertions covering:
  - Same character validation (both logs share "Bungo Brown" as listener)
  - Parser robustness (no 'other' eventType for lines with known color codes)
  - Data integrity (all amounts non-negative, all capAmounts non-negative)
  - Timestamp validation (all timestamps are valid Date instances)
  - Chronological ordering (entries sorted within each log)

  All 13 tests pass.

  **`describe('Cross-log — same character')`**
  - `it('both logs share the same listener name')` → parse both; `expect(logA.characterName).toBe(logB.characterName)`

  **`describe('Cross-log — parser robustness')`**
  - `it('no entry in either log has eventType other that should have been classified')` → for both logs, every `(combat)` line that starts with a known color code must NOT be `'other'`. Test: `const unexpectedOther = [...logA.entries, ...logB.entries].filter(e => e.eventType === 'other' && e.rawLine.includes('0xff00ffff')); expect(unexpectedOther.length).toBe(0)` — repeat for each known color
  - `it('all amounts are non-negative numbers')` → `[...logA.entries, ...logB.entries].filter(e => e.amount !== undefined).forEach(e => expect(e.amount).toBeGreaterThanOrEqual(0))`
  - `it('all capAmounts are non-negative numbers')` → `[...logA.entries, ...logB.entries].filter(e => e.capAmount !== undefined).forEach(e => expect(e.capAmount).toBeGreaterThanOrEqual(0))`
  - `it('all timestamps are valid Dates')` → `[...logA.entries, ...logB.entries].forEach(e => { expect(e.timestamp).toBeInstanceOf(Date); expect(isNaN(e.timestamp.getTime())).toBe(false) })`
  - `it('entries are sorted chronologically within each log')` → for each log, verify `entries[i].timestamp <= entries[i+1].timestamp` for all consecutive pairs

  Run `npx vitest run src/__tests__/integration/` — all tests in all three integration files must pass.

- [x] Add a `vitest.config.ts` at the project root if not already present, ensuring the integration tests can find the log files at the project root via `resolve(__dirname, '../../../filename.txt')` relative paths. Also add `"test:integration": "vitest run src/__tests__/integration/"` to `package.json` scripts alongside the existing `"test"` script.

  **Completed:** `vitest.config.ts` was already present and properly configured. Added `"test:integration": "vitest run src/__tests__/integration/"` to `package.json` scripts. Integration tests successfully resolve log files using relative paths.

- [x] Run the full test suite: `npm test && npm run test:integration`. All unit tests (from Phase 03 and 06) and all integration tests must pass with zero failures. If any test fails, fix the parser or analysis function — do not modify the expected assertion values (they are ground truth from the real files).

  **Completed:** Full test suite executed successfully:
  - 48 integration tests for Log A (logA.test.ts) ✓
  - 23 integration tests for Log B (logB.test.ts) ✓
  - 13 cross-log integration tests (crossLog.test.ts) ✓
  - 33 unit tests (parser.test.ts) ✓
  - **Total: 117 tests passed, 0 failures**
