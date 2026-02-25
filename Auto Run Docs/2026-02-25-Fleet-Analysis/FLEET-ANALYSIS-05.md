# Fleet Analysis — Phase 05 (Drill-down cross-matrix)

Run the TypeScript check after completing edits:
`export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH" && node node_modules/.bin/tsc --noEmit`

 - [x] `src/components/fleet/FleetDamageDealtContent.tsx` — add `DamageDealtMatrix`
  - Action: Add `CrossEntry` type, `buildDamageDealtMatrix(entries)` helper, and `DamageDealtMatrix` component before the main export. The helper should build `byPilot`, `byTarget`, `pilots`, and `targets` as described. The component should:
    - Allow selecting a pilot or target
    - Show left panel of pilots (ranked by damage) and right panel of targets
    - Render `FleetPilotDpsChart` with chartEntries filtered by selection
    - Provide click handlers that toggle selection

  - Action: Replace existing "DPS PER TARGET" Panel with:

```tsx
      {/* Drill-down: fleet pilot ↔ target */}
      <Panel title="DAMAGE MATRIX — FLEET PILOTS vs TARGETS">
        <DamageDealtMatrix entries={entries} />
      </Panel>
```

  - Action: Remove unused engagement-table related state and helpers: `zoomedTarget`, `handleTargetClick`, `engagementRows`, `engagementColumns`, `buildEngagementColumns`, `EngagementRow` type — but keep analysis stat cards. Ensure any remaining references to removed identifiers are also cleaned.

  - Verification: file compiles and the new panel renders without type errors.

  - [x] `src/components/fleet/FleetDamageTakenContent.tsx` — add `DamageTakenMatrix`
  - Action: Add `buildDamageTakenMatrix(entries)` helper and `DamageTakenMatrix` component after `PilotDamageTakenBars`. Mirror `DamageDealtMatrix` but left = pilots damaged, right = attackers. Use highlight styles described.

  - Action: Replace existing "DAMAGE TAKEN — PER PILOT" Panel with:

```tsx
      {/* Drill-down: fleet pilot ↔ attacker */}
      <Panel title="DAMAGE MATRIX — FLEET PILOTS vs ATTACKERS">
        <DamageTakenMatrix entries={filteredEntries} />
      </Panel>
```

  - Note: `computePerPilotDamageTaken` from Phase 3 should be used by this component's chart.

  - Note: implemented `DamageTakenMatrix` and added drill-down panel in `src/components/fleet/FleetDamageTakenContent.tsx`.
  - Verification: file compiles and the new panel renders without type errors.

 - [x] Phase 05 verification — run TypeScript check
  - Action: Run `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH" && node node_modules/.bin/tsc --noEmit`
  - Success criteria: `tsc` exits with status 0.
  - Verification notes: ran TypeScript check in repo root; `tsc --noEmit` exited with status 0 and produced no type errors. Images analyzed for this task: 0.
