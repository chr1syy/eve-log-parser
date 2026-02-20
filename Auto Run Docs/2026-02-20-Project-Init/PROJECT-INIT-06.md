# Phase 06 — Parser Extensions for Analysis Layer

Phase 03 built the core parser with correct types and event classification. This phase adds the additional `LogStats` fields and per-target damage grouping that the analysis views (Phases 07-09) require. No parser logic changes — only additive extensions.

## Tasks

- [x] Extend `LogStats` in `src/lib/types.ts` with the fields needed by the analysis pages. Add these fields to the existing `LogStats` interface (do not remove existing fields):
  ```ts
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
  ```

- [x] Update `computeStats` in `src/lib/parser/computeStats.ts` to populate the new fields:
  - `damageDealtByTarget`: group `damage-dealt` entries by `(pilotName ?? shipType ?? 'Unknown') + shipType`, aggregate `totalDamage` and `hitCount`, sort by `totalDamage` desc
  - `repReceivedBySource`: group `rep-received` entries by `(repShipType + repModule)`, aggregate `total` (sum of `amount`) and `hitCount`, flag `isBot`, sort by `total` desc
  - `capReceivedByShipType`: group `neut-received` entries by `capShipType`, aggregate `totalGj` (sum of `capAmount`) and `hitCount`, sort by `totalGj` desc
  - `capDealtByModule`: group `neut-dealt` and `nos-dealt` entries by `capModule`, aggregate totals. `zeroHits` = count where `capAmount === 0`. Sort by `totalGj` desc.

- [x] Update `src/__tests__/parser.test.ts` to add tests for the new `LogStats` fields:
  - Mock 3 `damage-dealt` entries targeting two different pilots — verify `damageDealtByTarget` has correct grouping and totals
  - Mock 2 `rep-received` entries (one from a ship, one from a bot) — verify `repReceivedBySource` correctly flags `isBot`
  - Mock 2 `neut-received` entries from the same ship type — verify `capReceivedByShipType` aggregates correctly
  - Mock 1 `nos-dealt` with `capAmount = 0` — verify `zeroHits = 1` in `capDealtByModule`
  - Run `npx vitest run` — all tests must pass

