# EVE Log Parser — Agent Reference

This is a Next.js + TypeScript web application for parsing and analysing EVE Online combat logs. It supports both single-player log analysis and multi-player fleet analysis with real-time collaboration.

-- Persona: High-class EVE Pilot & Lead Integrator --

- Practical, opinionated, and focused on reproducible parsing. I value clear structure, small responsibilities, and testable units.

## 1. Core EVE Combat Concepts

- Damage types: EM, Thermal, Kinetic, Explosive. Always store `damage_type` when present; analytics depend on it.
- Weapon categories: turrets (projectile/energy/hybrid), missiles (rocket/light/cruise/heavy), drones, remote launchers, and EWAR modules (neuts, scrams, webs, jammers).
- Range/accuracy model: turrets use Optimal + Falloff and tracking vs transversal; missiles use flight speed, explosion velocity and radius. Capture range and signature when possible.

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Runtime | React 19 |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 (EVE-themed custom colours) |
| Testing | Vitest 4 + React Testing Library + jsdom |
| Charting | Recharts 3 |
| Storage | File-based JSON under `data/` (volume-mounted in production) |
| Authentication | NextAuth 5 (beta) — EVE SSO |
| Icons | Lucide React |
| Utilities | date-fns, react-countup, clsx, tailwind-merge, react-dropzone |

## 3. Where Things Live

### Parser Core — `src/lib/parser/`
- `eveLogParser.ts` — core line parsing, regex tokenisation, and normalisation.
- `computeStats.ts` — aggregation, rolling calculations, and metric computation.
- `index.ts` — barrel export.
- `sampleLog.ts` — combat log fixtures for testing.

### Analysis — `src/lib/analysis/`
- `damageDealt.ts` — damage-dealt analysis, per-target breakdown.
- `damageTaken.ts` — damage-received analysis, per-target breakdown.
- `tracking.ts` — turret tracking quality via rolling window (`computeRollingTracking`).
- `capAnalysis.ts` — capacitor pressure and neutraliser hit analysis.
- `repAnalysis.ts` — remote repair throughput and logistics analysis.

### Fleet Subsystem — `src/lib/fleet/`
- `fleetAnalysis.ts` — fleet-wide aggregation and metrics.
- `participantStats.ts` — per-pilot statistics computation.
- `logMerging.ts` — multi-log merging and deduplication.
- `sessionStore.ts` — fleet session state and persistence.
- `sseConnections.ts` — server-sent events for real-time fleet updates.
- `constants.ts` — fleet-specific configuration constants.

### Other `src/lib/` Modules
- `types.ts` — core event shapes and enums.
- `auth.ts` / `auth-utils.ts` / `auth.d.ts` — EVE SSO authentication.
- `npcFilter.ts` — NPC/site classification logic.
- `chartConstants.ts` — chart brush styling constants.
- `zoom.ts` — time-window zoom utilities.
- `audit.ts` — audit logging for fleet operations.
- `version.ts` — version management.
- `utils.ts` — general utility functions.

### Config — `src/lib/config/`
- `drones.ts` — drone type definitions and rules.

### Types — `src/types/`
- `fleet.ts` — fleet types, participant interfaces, and shared fleet contracts.

### Chart Components — `src/components/charts/` (11 components)
- `DamageDealtChart.tsx` — damage dealt time series with turret tracking quality overlay.
- `DpsTakenChart.tsx` — DPS taken with rolling window average.
- `CombinedChart.tsx` — multi-series chart with brush zoom control.
- `CapHitTimelineChart.tsx` — capacitor hit events timeline.
- `CapTimelineChart.tsx` — capacitor state progression.
- `DamagePerTargetTable.tsx` — damage-dealt-per-target breakdown (brush-window-aware).
- `DamageReceivedPerTargetTable.tsx` — damage-received-per-target breakdown.
- `CapPressurePerSourceTable.tsx` — cap pressure by attacker.
- `RepsPerSourceTable.tsx` — repair throughput by source.
- `RangeSlider.tsx` — time-range brush slider.
- `RawLogPanel.tsx` — raw log entry viewer.

### Fleet UI — `src/components/fleet/` (7 components)
- `FleetAnalysisTabs.tsx` — tab interface managing fleet views (overview, damage-dealt, damage-taken).
- `FleetDamageDealtContent.tsx` — fleet damage-dealt breakdown with brush filtering.
- `FleetDamageTakenContent.tsx` — fleet damage-taken breakdown with brush filtering.
- `FleetOverviewTab.tsx` — fleet summary statistics.
- `FleetParticipantsTable.tsx` — fleet members list.
- `FleetEnemiesTable.tsx` — hostiles/enemies list.
- `LogUploadForm.tsx` — combat log upload form.

### Dashboard — `src/components/dashboard/`
- `DamageOverTimeChart.tsx` — time-series damage visualisation.
- `DamageBreakdownChart.tsx` — damage type breakdown.
- `StatCard.tsx` — stats display card.

### Layout — `src/components/layout/`
- `Topbar.tsx` — top navigation bar with auth.
- `Sidebar.tsx` — side navigation menu.
- `AppLayout.tsx` — main layout wrapper.
- `VersionFooter.tsx` — footer with version info.

### Shared UI Primitives — `src/components/ui/`
- `DataTable.tsx` — generic reusable data table.
- `Button.tsx` — button primitive with EVE styling.
- `Panel.tsx` — panel container.
- `ConfirmModal.tsx` — confirmation dialog.
- `Badge.tsx` — status/label badge.
- `Tooltip.tsx` — tooltip component.
- `Divider.tsx` — horizontal divider.

### Other Components — `src/components/`
- `auth/EveSsoButton.tsx` — EVE Online SSO login button.
- `upload/DropZone.tsx` — drag-and-drop file upload.
- `upload/ShareButton.tsx` — log sharing button.
- `changelog/ChangelogList.tsx` / `VersionHeader.tsx` — version changelog display.
- `kills/KillRow.tsx` — kill/loss entry row.
- `logs/LogRenameInline.tsx` — inline log renaming.
- `ConsentBanner.tsx` — cookie/analytics consent banner.
- `LogHistoryItem.tsx` — history list entry.

### Hooks — `src/hooks/`
- `useParsedLogs.ts` — parsed logs context accessor.
- `useShareLog.ts` — log sharing functionality.
- `useConsent.ts` — consent preference management.

### Contexts — `src/contexts/`
- `LogsContext.tsx` — global logs state, upload queue, sharing logic.
- `FleetContext.tsx` — fleet-specific state (session, participants, events).
- `AuthContext.tsx` — authentication state.

### App Routes — `src/app/`

**Pages:**
- `/` — home/dashboard.
- `/charts` — charts analysis dashboard (`ChartsClient.tsx`).
- `/history` — log history view.
- `/kills` — kills/losses page.
- `/upload` — log upload interface.
- `/share/[uuid]` — shared log viewing.
- `/terms`, `/privacy`, `/changelog` — info pages.
- `/signin` — authentication flow.

**Fleet Routes:**
- `/fleet` — fleet sessions list.
- `/fleet/create` — create new fleet session.
- `/fleet/join` — join existing fleet session.
- `/fleet/[sessionId]` — fleet session detail view.

**API Routes:**
- `api/logs/` — log CRUD operations.
- `api/shared-logs/[uuid]` — shared log access.
- `api/user-logs/` — user log fetching.
- `api/fleet-sessions/` — fleet CRUD and related sub-routes (upload, join, logs, events SSE).
- `api/auth/[...nextauth]` — NextAuth handlers.
- `api/version/`, `api/changelog/`, `api/dsr/` — utility endpoints.

### Tests — `src/__tests__/` (58 test files)
Organised by feature area:
- `analysis/` — damageTaken, capAnalysis, damageSeries.
- `api/` — fleet-sessions, fleet-api-contract.
- `charts/` — damageDealtChart, capHitTimeline, chartsPage, repsCapTables, trackingEnrich.
- `components/fleet/` — all fleet components + integration.
- `contexts/` — FleetContext.
- `fleet/` — integration, data-consistency, error-handling.
- `integration/` — 11 integration tests (brush filtering, auth, parsing, tracking, uploads).
- `lib/fleet/` — participantStats, logMerging, fleetAnalysis.
- `pages/fleet/` — fleet page, create, join, sessionId.
- `server/` — upload-persist, getDisplayName, patch-update.
- `unit/` — tracking, resolveBrushRange, classifyWeaponSystem, multiplier.
- `e2e/` — fleet-workflow.
- Root-level: parser, auth, db, upload, version, history, dashboard tests.

## 4. How to Run and Develop

- Dev server: `npm run dev` (Next.js dev server).
- Build: `npm run build` and `npm start`.
- Tests: `npm test` (Vitest). Integration: `npm run test:integration`.
- Lint: `npm run lint` (ESLint). Prettier formatting is enforced; `prettier-plugin-tailwindcss` is enabled.

## 5. Code Style and Conventions

- Language: TypeScript with `strict` enabled. Keep public function types explicit in `src/lib` and `src/lib/analysis`.
- Imports: use the `@/` alias for `./src/*` (see `tsconfig.json`).
- Formatting: Prettier is authoritative. Run it before PRs.
- Linting: Fix ESLint warnings. Follow rules-of-hooks and prefer pure functional React components.
- Tailwind: Use tokens from `tailwind.config.ts`. Prefer utility classes and avoid inline styles.
- Tests: Vitest + Testing Library. Mock filesystem/time where appropriate. Keep tests deterministic.

## 6. Parser Best Practices

- Normalise input: strip HTML/color tags and decode HTML entities before applying regexes.
- Two-pass approach: (1) tokenise/normalise lines, (2) apply specialised regexes for combat, e-war, repairs, and module activations.
- Event shape: `{ timestamp, type, actor, actor_ship, target, target_ship, module, damage, damage_type, outcome, raw, uncertain? }`.
- Preserve timestamped non-combat context (`(notify)`, `(None)`) as `eventType: "other"` entries for Combat Log context; skip noisy prompt channels like `(hint)`/`(question)`.
- Conservative defaults: if damage is not parseable, set `damage: null` and `uncertain: true`.
- Tests: add unit tests for every new rule using fixtures under `src/__tests__/fixtures/`.

## 7. Key Metrics and Analysis

- Per-weapon: count, total, mean/median, hit-quality distribution, DPS in windows, turret tracking quality (rolling average `damageMultiplier` in 10-second windows via `computeRollingTracking`).
- Per-actor: usage profile, e-war produced, rep throughput, module uptime.
- Encounter timeline: annotate module activations, e-war windows, rep ticks, tackle events.
- Turret tracking quality: `src/lib/analysis/tracking.ts` — `computeRollingTracking(entries, windowMs)` returns `TrackingSeries[]` (timestamp, trackingQuality, shotCount, hitCount, missCount). Only processes outgoing turret shots (`damage-dealt` and `miss-outgoing`), excludes disintegrators; uses `damageMultiplier` as a proxy. Visualised in `DamageDealtChart` as three colour-coded lines (high ≥1.0 green, mid 0.7–1.0 yellow, low <0.7 red) with interpolation and tier-bridging. Guard: only shown when tracking-eligible turret shots exist so missile/drone logs are unaffected.

## 8. Fleet Feature Architecture

The fleet feature enables multi-player log analysis with real-time collaboration:
- **Session management**: create/join fleet sessions via `src/lib/fleet/sessionStore.ts`.
- **Log merging**: combine logs from multiple pilots with deduplication via `logMerging.ts`.
- **Real-time updates**: SSE connections push fleet state changes to all participants.
- **Brush filtering**: time-range selection filters all fleet charts and tables simultaneously.
- **API**: RESTful endpoints under `api/fleet-sessions/` with SSE for events.
- **State**: `FleetContext.tsx` provides fleet state to all fleet UI components.

## 9. Contributing and Maintenance

- When adding a new event type, update `AGENTS.md`, add parser unit tests, and extend types in `src/lib/types.ts`.
- Keep `Auto Run Docs/` updated for Maestro playbooks and checklists.
- When public types change, update `src/types/fleet.ts` and run the full test suite.

### Operational Checklist

- [ ] Run `npm test` after parser changes.
- [ ] Run `npm run lint` and fix ESLint warnings.
- [ ] Add unit tests for new parse rules under `src/__tests__/`.
- [ ] Update `AGENTS.md` when adding new event vocabulary or metrics.

-- end of briefing --
