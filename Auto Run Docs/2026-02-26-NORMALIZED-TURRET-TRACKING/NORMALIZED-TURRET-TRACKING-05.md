# Normalized Turret Tracking — Phase 05: Tests & CI

This document contains machine-executable tasks to add comprehensive tests and ensure CI/test commands cover the new functionality.

-- [x] Add/extend unit and integration tests covering:
  - Weapon classification (`src/__tests__/unit/classifyWeaponSystem.spec.ts`)
  - Multiplier mapping (`src/__tests__/unit/multiplier.spec.ts`)
  - Rolling tracking computation (`src/__tests__/unit/tracking.spec.ts`)
  - Parser integration test with fixture (`src/__tests__/integration/parser-turret.spec.ts`)
  - Chart rendering test (`src/__tests__/integration/chart-tracking.spec.tsx`)
  - Weapons table rendering test (`src/__tests__/integration/weapons-table-tracking.spec.tsx`)

  Files to change/add:
  - `src/__tests__/unit/*.spec.ts` (as listed)
  - `src/__tests__/integration/*.spec.tsx` (as listed)
  - `src/__tests__/fixtures/sample-turret-mix.txt`

  Verification:
  - Run full test suite: `npm test`
  - Success criteria: all new and existing tests pass.

 - [x] Update `package.json` test scripts if needed (do not change existing script names). Ensure `test:integration` covers integration tests.

Notes on change:
- `package.json` already contains `"test:integration": "vitest run src/__tests__/integration/"`, which covers the integration tests listed in this plan. No changes to `package.json` were required.

Notes:
- Keep tests fast and deterministic; avoid network or timing dependencies.
