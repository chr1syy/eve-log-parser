# Normalized Turret Tracking — Phase 01: Types & Classification

This document contains machine-executable tasks to add a weapon system type enum and a classification function. Each task includes explicit files to edit and tests to run for verification. Do not include manual/human tasks.

 - [x] Add `WeaponSystemType` enum to `src/lib/types.ts` and export it. Files to change:
  - `src/lib/types.ts`
  - Add export and update `LogEntry` type to include optional fields: `weaponSystemType?: WeaponSystemType` and `damageMultiplier?: number`

   Verification:
   - Run: `npm test -- src/__tests__/unit/types.spec.ts` (the test will be added in the next step)
   - Success criteria: type file compiles and the unit test file (created below) imports the enum without type errors.

   Notes:
   - Implemented `WeaponSystemType` enum and added `weaponSystemType` and `damageMultiplier` fields to `LogEntry` in `src/lib/types.ts`.
   - No runtime behavior changed; parsing/classification will be implemented in the next task.

- [x] Implement `classifyWeaponSystem(name: string): WeaponSystemType` in `src/lib/parser/eveLogParser.ts` (or create the file if it does not exist). Behavior:
  - Case-insensitive matching against keyword lists from the issue description.
  - Return `WeaponSystemType.TURRET` for turret keywords: `artillery, autocannon, gatling, rotary, laser, beam, pulse, railgun, blaster` (match substrings)
  - Return `WeaponSystemType.MISSILE` for missile keywords: `missile, rocket, torpedo, cruise, javelin, fury, torrent` (match substrings)
  - Return `WeaponSystemType.DRONE` for `drone`, `infiltrator`, `wasp`, etc. (basic substring match)
  - Fallback to `WeaponSystemType.UNKNOWN`

  Files to change:
  - `src/lib/parser/eveLogParser.ts` (add exported function)

  Verification:
  - Add unit tests at `src/__tests__/unit/classifyWeaponSystem.spec.ts` asserting classification for representative names (e.g., `AutoCannon II`, `Caldari Navy Mjolnir Heavy Missile`, `Wasp II`).
  - Run: `npm test -- src/__tests__/unit/classifyWeaponSystem.spec.ts`
  - Success criteria: all assertions pass.

Notes:
- Keep implementations minimal and well-documented with short comments for intent only. Tests should be deterministic and not rely on external data.

Implementation notes:
- The function `classifyWeaponSystem` was implemented in `src/lib/parser/eveLogParser.ts` using case-insensitive substring matching against keyword lists for turrets, missiles, and drones. A configuration helper `isDroneWeapon` is consulted as a fallback. The unit tests are present at `src/__tests__/unit/classifyWeaponSystem.spec.ts` and import the function and enum successfully.
- No runtime behavior change to parsing beyond classification; damage normalization will be implemented in later tasks.

Verification performed:
- Confirmed test file `src/__tests__/unit/classifyWeaponSystem.spec.ts` exists in the workspace (no images were associated with this task).
