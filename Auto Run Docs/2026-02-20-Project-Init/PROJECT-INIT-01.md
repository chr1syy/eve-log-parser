# Phase 01 — Project Scaffolding & Toolchain

Set up the Next.js project with TypeScript, Tailwind CSS, and all core dependencies for the EVE Log Parser.

## Tasks

- [x] Initialize a Next.js 14 app with TypeScript in `/home/chris/code/eve-log-parser` using `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`. Accept all defaults. Confirm the project initializes without errors.
  > **Completed 2026-02-20**: Initialized via temp dir (project dir was non-empty with pre-existing files). Installed Next.js 16.1.6 (latest), React 19, TypeScript 5, Tailwind v4, ESLint 9. Note: `create-next-app` resolved to the latest stable release (16.x), not 14.x.

- [x] Install all additional dependencies in one shot:
  ```
  npm install recharts lucide-react react-dropzone clsx tailwind-merge date-fns react-countup
  npm install -D @types/node prettier prettier-plugin-tailwindcss
  ```
  Verify `package.json` contains all packages.
  > **Completed 2026-02-20**: All packages installed and verified in `package.json`.

- [x] Configure `tailwind.config.ts` with the full EVE design system tokens from `DESIGN_SYSTEM.md` (located at `/home/chris/code/eve-log-parser/DESIGN_SYSTEM.md`). Add:
  - Custom colors: `void`, `space`, `panel`, `elevated`, `overlay`, `cyan.*`, `gold.*`, `border.*`, `status.*`, `text.*`
  - Custom fontFamily: `ui` (Rajdhani) and `mono` (JetBrains Mono)
  - Set `darkMode: 'class'`
  - Keep existing Tailwind defaults (extend, don't replace)
  > **Completed 2026-02-20**: Created `tailwind.config.ts` with all EVE design tokens. Note: Project uses Tailwind v4 which is CSS-first; design tokens also registered in `@theme inline` block in `globals.css` for full v4 compatibility. The `@config` directive in `globals.css` loads the TS config for backward compatibility.

- [x] Update `src/app/layout.tsx` to:
  - Import Google Fonts for Rajdhani (400,500,600,700) and JetBrains Mono (400,500) using Next.js `next/font/google`
  - Set `<html lang="en" className="dark">` with body class `bg-void text-text-primary font-ui antialiased`
  - Set metadata: title `"EVE Log Parser"`, description `"Parse and visualize EVE Online combat logs"`
  - Set viewport theme-color to `#060810`
  > **Completed 2026-02-20**: `layout.tsx` updated with Rajdhani + JetBrains Mono via `next/font/google`, dark class, EVE metadata, and viewport theme-color. Used `Viewport` export for theme-color (Next.js 13+ pattern).

- [x] Create `src/lib/utils.ts` with a `cn()` utility function using `clsx` and `tailwind-merge` for conditional class merging:
  ```ts
  import { clsx, type ClassValue } from 'clsx'
  import { twMerge } from 'tailwind-merge'
  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }
  ```
  > **Completed 2026-02-20**: Created `src/lib/utils.ts` with `cn()` utility as specified.

- [x] Update `src/app/globals.css` to:
  - Keep Tailwind directives (`@tailwind base/components/utilities`)
  - Add CSS custom properties for all design tokens (matching `DESIGN_SYSTEM.md` section 2)
  - Add the `scanReveal`, `pulseGlow`, and `flicker` keyframe animations from `DESIGN_SYSTEM.md` section 7
  - Add base styles: `* { border-color: #1a2540 }`, scrollbar styling (dark, thin, cyan thumb)
  - Add `.font-mono` override to ensure JetBrains Mono for all number data
  > **Completed 2026-02-20**: `globals.css` updated with `@import "tailwindcss"` (v4 syntax), `@config` directive, CSS custom properties for all design tokens, `@theme inline` block for v4 utility class generation, all three keyframe animations, base border/scrollbar styles, and `.font-mono` override.

- [x] Verify the dev server starts cleanly with `npm run dev` (just run it briefly to check for errors, then stop it). Fix any TypeScript or config errors before moving on.
  > **Completed 2026-02-20**: Dev server started successfully — `✓ Ready in 998ms` with no TypeScript or config errors.
