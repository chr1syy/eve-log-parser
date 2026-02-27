# EVE Weapon Systems — Agent Reference

I write as an experienced capsuleer and as the resident code-first parser for this repo. This document covers EVE combat concepts you need and, importantly, how this repository is organised: where to find parsers, analysis, UI, tests, and the conventions we follow. Consider this your operating manual.

-- Persona: High-class EVE Pilot & Lead Integrator --

- Practical, opinionated, and focused on reproducible parsing. I value clear structure, small responsibilities, and testable units.

1. Core concepts (short and practical)

- Damage types: EM, Thermal, Kinetic, Explosive. Always store `damage_type` when present; analytics depend on it.
- Weapon categories: turrets (projectile/energy/hybrid), missiles (rocket/light/cruise/heavy), drones, remote launchers, and EWAR modules (neuts, scrams, webs, jammers).
- Range/accuracy model: turrets use Optimal + Falloff and tracking vs transversal; missiles use flight speed, explosion velocity and radius. Capture range and signature when possible.

2. Where things live in this codebase

- Parser core: `src/lib/parser` —
  - `src/lib/parser/eveLogParser.ts` — core line parsing and normalisation.
  - `src/lib/parser/computeStats.ts` — aggregation and stats.
  - `src/lib/parser/index.ts` and `src/lib/parser/sampleLog.ts` — entry points and fixtures.
- Analysis: `src/lib/analysis` (`damageTaken.ts`, `damageDealt.ts`, `repAnalysis.ts`, `capAnalysis.ts`).
- UI: `src/components` and `src/app` (fleet pages under `src/app/fleet`, charts under `src/components/charts`).
- Shared UI primitives: `src/components/ui` (DataTable, Panel, Button, Badge, Tooltip).
- Hooks & Context: `src/hooks` and `src/contexts` (`useParsedLogs`, `LogsContext`, `FleetContext`).
- Tests: `src/__tests__` (unit and integration). Integration tests live in `src/__tests__/integration/`.
- Docs & playbooks: `Auto Run Docs/` and `docs/`.

3. How to run and develop locally

- Dev server: `npm run dev` (Next.js dev server).
- Build: `npm run build` and `npm start`.
- Tests: `npm test` (Vitest). Integration: `npm run test:integration`.
- Lint: `npm run lint` (ESLint). Prettier formatting is enforced; `prettier-plugin-tailwindcss` is enabled.

4. Code style and conventions

- Language: TypeScript with `strict` enabled. Keep public function types explicit in `src/lib` and `src/lib/analysis`.
- Imports: use the `@/` alias for `./src/*` (see `tsconfig.json`).
- Formatting: Prettier is authoritative. Run it before PRs.
- Linting: Fix ESLint warnings. Follow rules-of-hooks and prefer pure functional React components.
- Tailwind: Use tokens from `tailwind.config.ts`. Prefer utility classes and avoid inline styles.
- Tests: Vitest + Testing Library. Mock filesystem/time where appropriate. Keep tests deterministic.

5. Parser best practices for this repo

- Normalise input: strip HTML/color tags and decode HTML entities before applying regexes.
- Two-pass approach: (1) tokenise/normalise lines, (2) apply specialised regexes for combat, e-war, repairs, and module activations.
- Event shape: { timestamp, type, actor, actor_ship, target, target_ship, module, damage, damage_type, outcome, raw, uncertain? }.
- Conservative defaults: if damage is not parseable, set `damage: null` and `uncertain: true`.
- Tests: add unit tests for every new rule using fixtures under `src/__tests__/fixtures/`.

6. Metrics and analysis we care about

- Per-weapon: count, total, mean/median, hit-quality distribution, DPS in windows.
- Per-actor: usage profile, e-war produced, rep throughput, module uptime.
- Encounter timeline: annotate module activations, e-war windows, rep ticks, tackle events.

7. Contributing and maintenance notes

- When adding a new event type, update `AGENTS.md`, add parser unit tests, and extend types in `src/lib/types.ts`.
- Keep `Auto Run Docs/` updated for Maestro playbooks and checklists.
- When public types change, update `src/types/fleet.ts` and run the full test suite.

8. Implementation snippets and quick references

- Conceptual normalisation example:

```
// strip tags then apply small regexes per event type
const stripped = line.replace(/<[^>]+>/g, '')
// combat example: [TIME] (combat) 123 from <b>Pilot</b> - Weapon - Hits
```

- Update parser helpers here:
  - `src/lib/parser/eveLogParser.ts`
  - `src/lib/parser/computeStats.ts`

9. Small operational checklist (for maintainers)

- [ ] Run `npm test` after parser changes.
- [ ] Run `npm run lint` and fix ESLint warnings.
- [ ] Add unit tests for new parse rules under `src/__tests__/`.
- [ ] Update `AGENTS.md` when adding new event vocabulary or metrics.

10. TL;DR

- This is a Next.js + TypeScript app for parsing and analysing EVE combat logs. Parsers live in `src/lib/parser`, analytics in `src/lib/analysis`, UI under `src/components` and `src/app`. Follow TypeScript strictness, ESLint, and Prettier with the Tailwind plugin. Add tests for parser changes and keep this document current.

Appendix: quick file references

- `src/lib/parser/eveLogParser.ts`
- `src/lib/parser/computeStats.ts`
- `src/lib/analysis/damageTaken.ts`
- `src/components/fleet/`
- `src/components/ui/`
- `src/hooks/useParsedLogs.ts`
- `src/__tests__/`

-- end of briefing --
