---
type: reference
title: Fleet Feature Contributing Guide
created: 2026-02-24
tags:
  - fleet
  - contributing
  - documentation
related:
  - "[[PHASE_2_ROADMAP]]"
  - "[[Fleet-Feature-README]]"
  - "[[Fleet-API]]"
---

# Fleet Feature Contributing Guide

## Add a New Fleet Analysis Tab

1. Create a new tab component in `src/components/fleet/Fleet<Name>Tab.tsx`.
2. Import the relevant aggregation function from `src/lib/fleet/fleetAnalysis.ts` (or `src/lib/fleet/participantStats.ts` when needed).
3. Wire the component into `src/components/fleet/FleetAnalysisTabs.tsx` so it appears in the tab list and routes.
4. Add a component test at `src/__tests__/components/fleet/Fleet<Name>Tab.test.tsx` using fixtures from `src/__tests__/fixtures/fleet-logs/`.
5. If the tab introduces new aggregation output, update `src/lib/fleet/README.md` to document the new exports.

## Add a New Fleet API Endpoint

1. Choose the correct route scope:
   - Session-level: `src/app/api/fleet-sessions/route.ts` or a new nested folder under `src/app/api/fleet-sessions/`.
   - Session-id scoped: create a folder under `src/app/api/fleet-sessions/[id]/`.
2. Implement the handler in `route.ts` and follow existing request/response shapes.
3. Add API tests under `src/__tests__/api/` with fixtures or mocks as needed.
4. Document the endpoint in `src/app/api/fleet-sessions/API.md` with request/response schemas and a curl example.

## Code Style and Patterns

- Follow existing fleet component structure in `src/components/fleet/`.
- Keep TypeScript strict mode intact; avoid `any` and prefer explicit types from `src/types/fleet.ts`.
- Add JSDoc blocks to public functions and components that are meant for reuse.
- Prefer aggregation outputs from `analyzeFleetCombat()` to avoid recomputing in UI components.

## Git Workflow

- Branch naming: `feat/fleet-<description>`.
- Write descriptive commit messages that focus on intent and scope.

## Test Expectations

- Every new component or API route requires matching test coverage.
- Run fleet tests via `npm test -- src/__tests__/fleet/` and API tests via `npm test -- src/__tests__/api/`.
- Keep test file names aligned with their source modules.
