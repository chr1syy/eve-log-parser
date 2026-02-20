# Phase 02 — Core Layout & Navigation Components

Build the shell: sidebar navigation, topbar, and page layout wrapper. All components use the EVE design system from `DESIGN_SYSTEM.md`.

## Tasks

- [x] Create `src/components/layout/Sidebar.tsx`. Requirements:
  - Fixed left sidebar, 240px wide, `bg-void` background, `border-r border-border` right border
  - Logo area (64px tall, border-bottom): show "EVE LOG PARSER" in Rajdhani 700 uppercase, with a 2px cyan underline accent below the word "LOG". Add a small target/crosshair SVG icon using Lucide's `Crosshair` icon in cyan.
  - Nav items (array-driven, defined in the component): Dashboard, Upload, Kill Report, Fleet Analysis, Settings — each with a Lucide icon
  - Active item style: `border-l-2 border-cyan-glow bg-cyan-ghost text-cyan-glow`
  - Inactive item style: `text-text-secondary hover:text-text-primary hover:bg-elevated`
  - Use Next.js `usePathname()` to determine active route
  - Bottom section: show app version `v0.1.0` in `text-muted text-xs font-mono`

- [x] Create `src/components/layout/Topbar.tsx`. Requirements:
  - Full-width bar, 64px tall, `bg-space border-b border-border`
  - Left: page title slot (passed as prop)
  - Right: a "Upload Logs" button — outline style with `border-cyan-glow text-cyan-glow` + Lucide `Upload` icon, uppercase Rajdhani
  - Add a subtle live "pulse" indicator dot (green, `animate-pulse`) labeled "SYSTEM ONLINE" in `text-xs text-text-muted font-mono`

- [x] Create `src/components/layout/AppLayout.tsx`. Requirements:
  - Wraps all pages: Sidebar (left, fixed) + main area (flex-1, flex-col)
  - Main area: Topbar on top, then `<main>` with `p-6 overflow-auto`
  - Accepts `title: string` prop passed to Topbar
  - Must handle scroll correctly — only the main content area scrolls, sidebar and topbar stay fixed

- [x] Create `src/components/ui/Panel.tsx` — the core card/panel component:
  - Props: `children`, `title?: string`, `variant?: 'default' | 'accent' | 'gold'`, `className?`
  - `default`: `bg-space border border-border border-t-2 border-t-cyan-dim rounded-sm shadow-lg`
  - `accent`: same but `border-t-cyan-glow` + subtle cyan outer glow via box-shadow
  - `gold`: same but `border-t-gold-bright` + gold outer glow
  - Apply EVE corner-cut clip-path (top-right 12px cut): `clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)`
  - If `title` is provided, render a panel header: uppercase, `text-text-secondary text-sm tracking-widest font-ui font-600`, with a thin cyan bottom border separator
  - Export both named and default

- [x] Create `src/components/ui/Button.tsx` — reusable button component:
  - Props: `variant?: 'primary' | 'secondary' | 'danger'`, `size?: 'sm' | 'md' | 'lg'`, `icon?: ReactNode`, `children`, all native button props
  - All variants: uppercase, Rajdhani 600, `tracking-wider`, sharp corners (`rounded-sm`), transition 150ms
  - `primary`: `border border-cyan-glow text-cyan-glow hover:bg-cyan-ghost hover:shadow-[0_0_12px_#00d4ff40]`
  - `secondary`: `border border-border text-text-secondary hover:border-cyan-dim hover:text-text-primary`
  - `danger`: `border border-status-kill text-status-kill hover:bg-[#e53e3e15]`
  - Include icon slot (left of text, 16px)
  - Export as default

- [x] Create `src/components/ui/Badge.tsx` — status badge component:
  - Props: `variant?: 'default' | 'cyan' | 'gold' | 'red' | 'green'`, `children`
  - All: `text-xs uppercase tracking-wider font-mono rounded-sm px-2 py-0.5`
  - Per variant colors from `DESIGN_SYSTEM.md` section 5 (Badges)
  - Export as default

- [x] Update `src/app/page.tsx` to use `AppLayout` with title "DASHBOARD" and render a placeholder `<Panel title="OVERVIEW">Coming soon</Panel>` to verify the full shell renders. Run `npm run build` to confirm zero TypeScript errors.
  <!-- ✅ Build passed (Next.js 16.1.6 Turbopack, 0 TS errors, static prerender confirmed) -->
