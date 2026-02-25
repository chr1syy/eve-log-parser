# Fleet Analysis — Phase 06 (Final verification)

Final verification tasks to run after implementing all phases.

- [x] Run TypeScript check
  - Action: `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH" && node node_modules/.bin/tsc --noEmit`
  - Success criteria: zero type errors.
  - Result: command executed; zero type errors (tsc exited 0).

- [ ] Fix any remaining type errors
  - Action: Address TS errors introduced by previous edits. If an import is unused (e.g., `DpsTakenChart`, `TargetEngagement`), remove it.

- [ ] Confirm specific import removals
  - Action: Verify the following imports are removed where applicable:
    1. `DpsTakenChart` removed from `src/components/fleet/FleetDamageTakenContent.tsx` if replaced.
    2. `TargetEngagement` import in `src/components/fleet/FleetDamageDealtContent.tsx` removed if engagement table is fully replaced.

- [ ] Smoke test (manual)
  - Action: Run the app locally and visit fleet pages to ensure no runtime crashes in the modified components. Perform the following checks:
    - Create and join fleet sessions; confirm localStorage behavior matches Phase 2.
    - Open Fleet > Session: confirm access gating works when localStorage doesn't have the UUID.
    - Open Fleet Analysis tabs: confirm new charts and matrices render and remain responsive.
