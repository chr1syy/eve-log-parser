# Phase 05 — Kill Report & Data Table Views

Build the detailed kill report page with a full filterable log table and individual entry detail.

## Tasks

- [x] Create `src/components/ui/DataTable.tsx` — a reusable sortable/filterable table:
  - Props: `columns: Column[]`, `data: T[]`, `searchable?: boolean`, `pageSize?: number`
  - Column definition: `{ key: string, label: string, render?: (value, row) => ReactNode, sortable?: boolean, width?: string }`
  - Table styles from `DESIGN_SYSTEM.md` section 5 (Tables):
    - Header: `bg-panel text-text-secondary uppercase tracking-widest text-xs font-ui border-b border-border`
    - Rows: `border-b border-border-subtle hover:bg-elevated transition-colors`
    - Numeric cells: `font-mono` class
    - Sticky header
  - Sortable columns: show sort arrow (Lucide `ChevronUp/Down`), toggle asc/desc on click
  - If `searchable`: render a styled `<input>` above the table using design system input styles
  - Pagination: simple prev/next with page count display in `font-mono text-text-muted`

- [x] Create `src/components/kills/KillRow.tsx` — a specialized table row for kill/loss events:
  - Shows: timestamp (monospace, text-muted), event type badge (Kill=red, Loss=green, Miss=gray), pilot name (cyan if kill target, text-primary otherwise), ship type, weapon used, damage amount (gold, monospace), system name
  - Left border accent: `border-l-2 border-status-kill` for kills, `border-l-2 border-status-safe` for losses
  - Pilot name shows corp ticker in brackets: `Pilot Name [CORP]` — ticker in text-muted

- [x] Create `src/app/kills/page.tsx` — Kill Report page:
  - Use `AppLayout` with title "KILL REPORT"
  - Use `useParsedLogs` hook
  - Filter bar above table: filter buttons for All / Kills / Losses / Misses using `Button` (secondary, active = primary style)
  - Session selector: if multiple parsed logs, show a dropdown/tab to switch between them
  - Render `DataTable` with `KillRow` as the row renderer for each `LogEntry`
  - Stats summary bar below filter bar: total shown, kills count (red), losses count (green) — inline, separated by `|` dividers in text-muted
  - Empty state if filtered results = 0: "NO EVENTS MATCH FILTER" in text-muted centered

- [x] Create `src/components/ui/Tooltip.tsx` — lightweight hover tooltip:
  - Wraps any child element
  - Shows content in a positioned div: `bg-overlay border border-border-active text-text-primary text-xs font-mono p-2 rounded-sm`
  - Use CSS positioning (relative parent, absolute tooltip), no external lib needed
  - Fade in/out with `opacity` transition 150ms

- [x] Create `src/components/ui/Divider.tsx` — decorative section divider:
  - Horizontal line with optional label
  - Line: `border-t border-border`
  - If label: centered text with `bg-space px-3 text-text-muted text-xs uppercase tracking-widest font-ui`
  - EVE variant: add small cyan diamond glyphs `◆` on either side of the label in cyan-dim

- [x] Run `npm run build` and fix any TypeScript errors across all components created in phases 02-05. Ensure zero build errors and zero `any` types introduced without explicit comment justification.
  > **Completed 2026-02-20**: Build passes cleanly — `✓ Compiled successfully in 6.4s`, zero TypeScript errors. Routes: `/`, `/kills`, `/upload` all static prerender successfully.
