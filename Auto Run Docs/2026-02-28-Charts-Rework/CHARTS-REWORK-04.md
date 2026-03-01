# Charts Rework — Phase 04: Test Updates + Lint/Build Validation

## Goal

Fix tests broken by the removed pages, then validate with the test suite, lint, and TypeScript build. Five focused tasks — each is a single action.

## Context

- Pages removed: `src/app/damage-dealt/`, `src/app/damage-taken/`, `src/app/cap-pressure/`.
- Sidebar nav items removed: "Damage Out", "Damage In", "Cap Pressure" → replaced with "Charts" at `/charts`.
- Test runner: Vitest (`npm test`).
- **All npm commands must be prefixed with `source ~/.nvm/nvm.sh &&`.**
- **If any npm command fails to execute** (nvm not found, node error, etc.), note the exact error message and mark the task complete so Maestro proceeds to the next task.

## Tasks

 - [x] **Task 4a — Handle `src/__tests__/integration/damageDealtPage.test.tsx`**

  Read `src/__tests__/integration/damageDealtPage.test.tsx` in full.

  - The test imported and rendered the removed page component `src/app/damage-dealt/page.tsx`, so I deleted the entire test file: `src/__tests__/integration/damageDealtPage.test.tsx`.

  - If the file only tests analysis functions (e.g., `generateDamageDealtTimeSeries`, `analyzeDamageDealt`) without importing the page component, keep the file unchanged.

  No other files should be touched in this task.

 - [x] **Task 4b — Update navigation/route assertions in fleet and page tests**

  Read these two files in full:
  - `src/__tests__/pages/fleet/[sessionId].test.tsx`
  - `src/__tests__/components/fleet/FleetAnalysisTabs.test.tsx`

  For each file, make **only** the following targeted changes (leave every other assertion untouched):

  - Any `screen.getByText('Damage Out')` or `expect(...).toContain('Damage Out')` that is testing Sidebar navigation labels → change to `'Charts'`.
  - Any `screen.getByText('Damage In')` testing Sidebar nav → change to `'Charts'`.
  - Any `screen.getByText('Cap Pressure')` testing Sidebar nav → change to `'Charts'`.
  - Any `href="/damage-dealt"` or `href="/damage-taken"` or `href="/cap-pressure"` in test expectations → change to `href="/charts"`.
  - Any `import` statement that imports from `src/app/damage-dealt/`, `src/app/damage-taken/`, or `src/app/cap-pressure/` → remove the import and any test blocks that use it.

  **Do NOT touch** assertions that reference "Cap Pressure", "Damage Out", "Damage In" as **fleet analysis tab labels** (these tabs live in `FleetAnalysisTabs.tsx` and have not been removed). Only update references that are specifically about the Sidebar navigation or page routes.

   If neither file contains any of the above patterns, make no changes and mark complete.

   NOTE: I inspected `src/__tests__/pages/fleet/[sessionId].test.tsx` and `src/__tests__/components/fleet/FleetAnalysisTabs.test.tsx` in full — there are no assertions testing Sidebar navigation labels or `href` values that reference the removed pages. The remaining references to "Damage Dealt", "Damage Taken", and "Cap Pressure" are fleet analysis tab labels and were intentionally left unchanged.

 - [x] **Task 4c — Run the test suite**

   ```bash
   source ~/.nvm/nvm.sh && npm test -- --run 2>&1 | tail -50
   ```

   Result: The test command failed to execute because the test runner binary was not found. Exact output observed when running the command in this environment:

   ```
   > eve-log-parser@0.1.0 test
   > vitest run --run

   sh: 1: vitest: not found
   ```

   Action: Marking this task complete per the playbook instructions (npm command failed to execute). No code changes were required to fix tests here.

- [ ] **Task 4d — Run ESLint and fix new files**

  ```bash
  source ~/.nvm/nvm.sh && npm run lint 2>&1 | tail -50
  ```

  Fix lint errors **only in these files** (do not touch other files):
  - `src/components/charts/CombinedChart.tsx`
  - `src/components/charts/RawLogPanel.tsx`
  - `src/app/charts/page.tsx`
  - `src/components/layout/Sidebar.tsx`

  After fixing, confirm zero errors in the new files:
  ```bash
  source ~/.nvm/nvm.sh && npm run lint 2>&1 | grep -E "CombinedChart|RawLogPanel|charts/page|Sidebar" | head -20
  ```
  If the lint command itself fails to execute, note the error and mark complete.

- [ ] **Task 4e — Run TypeScript type check and fix new files**

  ```bash
  source ~/.nvm/nvm.sh && npx tsc --noEmit --project tsconfig.json 2>&1 | tail -50
  ```

  Fix TypeScript errors **only in these files** (do not touch other files):
  - `src/components/charts/CombinedChart.tsx`
  - `src/components/charts/RawLogPanel.tsx`
  - `src/app/charts/page.tsx`
  - `src/components/layout/Sidebar.tsx`

  After fixing, re-run to confirm zero errors in the changed files:
  ```bash
  source ~/.nvm/nvm.sh && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -E "CombinedChart|RawLogPanel|charts/page|Sidebar" | head -20
  ```
  If tsc itself fails to execute, note the error and mark complete.
