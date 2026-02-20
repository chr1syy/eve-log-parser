# Phase 04 — Upload Flow & Dashboard

Build the log file upload experience and the main dashboard view with stats cards and charts.

## Tasks

- [x] Create `src/components/upload/DropZone.tsx`:
  - Use `react-dropzone` to accept `.txt` and `.log` files (multiple)
  - Visual design from `DESIGN_SYSTEM.md` section 5 (File Upload):
    - Dashed border `border-2 border-dashed border-cyan-dim`
    - Background `bg-[#00d4ff08]`
    - On drag-over: `border-cyan-glow bg-[#00d4ff15]`
    - Center content: Lucide `Upload` icon (48px, cyan-dim), heading "DROP LOG FILES HERE" (Rajdhani 700, uppercase, tracked), subtext "or click to browse — .txt and .log files supported" (text-muted)
  - Below the dropzone: if files are selected, show a file list — each file as a row with filename, size, and a remove `X` button
  - On file acceptance: call `onFilesAccepted(files: File[])` prop callback
  - Show error state (wrong file type) with red border + error message

- [x] Create `src/app/upload/page.tsx`:
  - Use `AppLayout` with title "UPLOAD LOGS"
  - State: `files: File[]`, `parsedLogs: ParsedLog[]`, `isLoading: boolean`, `error: string | null`
  - Render `DropZone` component
  - "PARSE LOGS" `Button` (primary, disabled if no files) — on click, call `parseLogFile` for each file, collect results
  - Show a loading state while parsing: spinner or scan animation, text "INITIALIZING PARSE SEQUENCE..."
  - On success: show a summary panel per file (filename, total events, damage dealt, damage received, active time) with a "VIEW REPORT →" link
  - On error: show error in a red `Panel` with the error message
  - Store parsed results in `localStorage` under key `eve-parsed-logs` (JSON) for cross-page access

- [x] Create `src/hooks/useParsedLogs.ts`:
  - Custom hook that reads `ParsedLog[]` from `localStorage` key `eve-parsed-logs`
  - Returns `{ logs, activeLogs, setActiveLogs, clearLogs }`
  - `activeLogs` = the currently selected/active parsed log sessions
  - Handles SSR safely (check `typeof window !== 'undefined'`)

- [x] Create `src/components/dashboard/StatCard.tsx`:
  - Props: `label: string`, `value: string | number`, `subValue?: string`, `variant?: 'default' | 'cyan' | 'gold' | 'red' | 'green'`, `icon?: ReactNode`
  - Uses `Panel` as wrapper
  - Label: uppercase, `text-text-secondary text-xs tracking-widest font-ui`
  - Value: large, `text-2xl font-mono font-700`, colored by variant (cyan-glow, gold-bright, etc.)
  - Apply count-up animation using `react-countup` for numeric values
  - SubValue: small, `text-text-muted text-sm`
  - Icon: top-right corner, 20px, muted color

- [x] Create `src/components/dashboard/DamageOverTimeChart.tsx`:
  - Uses Recharts `AreaChart` or `BarChart`
  - Props: `entries: LogEntry[]`
  - Group entries by minute bucket and show damage dealt (cyan, `0xff00ffff` events) vs damage received (red, `0xffcc0000` events) over time
  - Chart styles from `DESIGN_SYSTEM.md` section 5 (Charts): dark background, subtle grid lines, cyan/gold lines, custom tooltip
  - Custom tooltip: `bg-overlay border-border-active text-text-primary font-mono text-xs`
  - Include a legend (dealt = cyan, received = red) using `Badge` component

- [x] Create `src/components/dashboard/DamageBreakdownChart.tsx`:
  - Uses Recharts `PieChart` or `RadialBarChart`
  - Props: `stats: LogStats`
  - Shows top weapons by hit count (pie segments)
  - Segment colors: primary = cyan-glow, others = progressively dimmer blues + gold for top-2
  - Include weapon name labels on segments or in a legend table below
  - Center label: "TOP WEAPONS" in uppercase text-muted

- [x] Create `src/app/page.tsx` (Dashboard):
  - Use `AppLayout` with title "DASHBOARD"
  - Use `useParsedLogs` hook to get data
  - If no logs: show an empty state — centered Panel with "NO LOGS PARSED" heading, subtext "Upload EVE combat logs to begin analysis", and a "UPLOAD LOGS" button linking to `/upload`
  - If logs present: render a 12-col grid layout:
    - Row 1: 4 StatCards — Total Events (`stats.totalEvents`), Damage Dealt (`stats.damageDealt`, gold), Damage Received (`stats.damageReceived`, red), Active Time (`stats.activeTimeMinutes` min, cyan)
    - Row 2: `KillLossChart` renamed to `DamageOverTimeChart` (8 cols) — shows damage dealt vs damage received bucketed by minute; + top targets table (4 cols) from `stats.topTargets`
    - Row 3: `DamageBreakdownChart` (6 cols) from `stats.topWeapons`; + top incoming attackers table (6 cols) from `stats.hitQualityReceived` summary
  - Run `npm run build` to confirm zero TypeScript/build errors

---

## Completion Notes — 2026-02-20

All tasks implemented and `npm run build` passes with zero TypeScript/build errors.

**Implementation notes:**
- `parseLogFile` in `eveLogParser.ts` takes a `File` object (not text + filename), corrected in `upload/page.tsx` accordingly.
- Recharts v3 `Legend` component does not support a `hide` prop; replaced with custom `Badge`-based legend rendered above the chart.
- `DamageOverTimeChart` buckets damage entries by `HH:MM` minute key and renders a dual-area chart (cyan=dealt, red=received).
- `DamageBreakdownChart` renders a donut `PieChart` with center label via SVG `<text>` elements and a legend table below.
- `useParsedLogs` re-hydrates `Date` objects from JSON on load (localStorage serializes them as strings).
- Dashboard merges stats across all active logs and renders 3-row grid layout; empty state shows when no logs are stored.
