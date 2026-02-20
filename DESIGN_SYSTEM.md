# EVE Log Parser — Design System

> A modern dark UI faithful to the EVE Online universe — industrial, precise, data-first.

---

## 1. Design Philosophy

EVE Online's interface is built around the idea of a **capsuleer's HUD**: dark space, glowing readouts, geometric precision. Our design takes that DNA and applies modern web UI principles:

- **Dark-first**: Backgrounds are near-black with layered depth
- **Data clarity**: Charts and tables are the hero — typography and color serve the data
- **Geometric precision**: Hard edges, fine borders, angular accents — no rounded-everything softness
- **Glow & luminance**: Accent colors emit perceived light via shadow and opacity tricks
- **Minimal chrome**: UI chrome stays quiet; content speaks

---

## 2. Color Palette

### Core Backgrounds
| Token             | Hex       | Use                              |
|-------------------|-----------|----------------------------------|
| `bg-void`         | `#060810` | Deepest background, page base    |
| `bg-space`        | `#0a0e14` | Primary surface (cards, panels)  |
| `bg-panel`        | `#0d1520` | Elevated panels, modals          |
| `bg-elevated`     | `#111d2e` | Hover states, active items       |
| `bg-overlay`      | `#162034` | Tooltips, dropdowns              |

### Accent — Capsuleer Cyan (Primary)
| Token             | Hex       | Use                              |
|-------------------|-----------|----------------------------------|
| `cyan-glow`       | `#00d4ff` | Primary CTA, active states, links|
| `cyan-mid`        | `#0099cc` | Hover states                     |
| `cyan-dim`        | `#005f80` | Borders, dividers, subtle accents|
| `cyan-ghost`      | `#00d4ff1a` | Subtle fills, highlights        |

### Accent — ISK Gold (Secondary)
| Token             | Hex       | Use                              |
|-------------------|-----------|----------------------------------|
| `gold-bright`     | `#c9a227` | Important metrics, warnings, XP  |
| `gold-mid`        | `#a07d1a` | Secondary labels                 |
| `gold-dim`        | `#5a4510` | Decorative borders               |
| `gold-ghost`      | `#c9a2271a` | Subtle fills                   |

### Status Colors
| Token             | Hex       | Use                              |
|-------------------|-----------|----------------------------------|
| `status-kill`     | `#e53e3e` | Kills, damage, danger            |
| `status-loss`     | `#fc8181` | Losses (softer red)              |
| `status-safe`     | `#38a169` | Safe, positive, online           |
| `status-neutral`  | `#718096` | Neutral entities                 |
| `status-hostile`  | `#e53e3e` | Hostile players/corps            |
| `status-friendly` | `#4299e1` | Friendly/blue standing           |
| `status-corp`     | `#38a169` | Corp members                     |

### Typography Colors
| Token             | Hex       | Use                              |
|-------------------|-----------|----------------------------------|
| `text-primary`    | `#e8eaf0` | Primary readable text            |
| `text-secondary`  | `#8892a4` | Labels, secondary info           |
| `text-muted`      | `#4a5568` | Disabled, placeholder text       |
| `text-accent`     | `#00d4ff` | Links, interactive text          |

### Border Colors
| Token             | Hex       | Use                              |
|-------------------|-----------|----------------------------------|
| `border-default`  | `#1a2540` | Standard component borders       |
| `border-active`   | `#00d4ff40` | Active/focused borders          |
| `border-subtle`   | `#0f1c30` | Dividers, subtle separators      |

---

## 3. Typography

### Font Stack
```
Primary (UI):    'Rajdhani', 'Barlow Condensed', sans-serif
Secondary (Data): 'JetBrains Mono', 'Fira Code', monospace
Fallback:         system-ui, -apple-system, sans-serif
```

**Why Rajdhani?** Condensed, geometric, slightly military — fits EVE's corps and tech aesthetic without being novelty. Pairs beautifully with JetBrains Mono for data readouts.

### Scale
| Token      | Size   | Weight | Line Height | Use                         |
|------------|--------|--------|-------------|-----------------------------|
| `text-xs`  | 11px   | 500    | 1.4         | Captions, timestamps        |
| `text-sm`  | 13px   | 500    | 1.5         | Labels, table cells         |
| `text-base`| 15px   | 400    | 1.6         | Body text                   |
| `text-md`  | 17px   | 500    | 1.5         | Card headers, section labels|
| `text-lg`  | 20px   | 600    | 1.4         | Panel titles                |
| `text-xl`  | 26px   | 700    | 1.2         | Page headers                |
| `text-2xl` | 34px   | 700    | 1.1         | Hero metrics (ISK, kills)   |
| `text-3xl` | 48px   | 800    | 1.0         | Dashboard stat callouts     |

### Text Patterns
- **All-caps labels**: Section headers, stat labels, table column headers (`letter-spacing: 0.1em`)
- **Monospace numbers**: All numeric data — kills, ISK, timestamps use JetBrains Mono
- **Glow text**: Key metrics use `text-shadow: 0 0 12px currentColor` for luminance effect

---

## 4. Spacing & Layout

### Spacing Scale (4px base)
```
1  →  4px
2  →  8px
3  →  12px
4  →  16px
5  →  20px
6  →  24px
8  →  32px
10 →  40px
12 →  48px
16 →  64px
```

### Layout Grid
- **Page max-width**: `1440px`
- **Content max-width**: `1280px`
- **Sidebar width**: `240px` (collapsed: `64px`)
- **Gutter**: `24px`
- **Column grid**: 12-column CSS grid

### Z-Index Scale
```
base:     0
raised:   10
sticky:   100
dropdown: 200
modal:    300
toast:    400
```

---

## 5. Component Patterns

### Panels / Cards
```
Background:   bg-space (#0a0e14)
Border:       1px solid border-default (#1a2540)
Border-top:   2px solid cyan-dim (#005f80)   ← signature top accent
Border-radius: 2px  ← sharp corners, not rounded
Padding:      24px
Shadow:       0 4px 24px rgba(0, 0, 0, 0.6)
```

**Accent variant** (highlighted panels):
```
Border-top:   2px solid gold-bright (#c9a227)
Box-shadow:   0 0 0 1px #c9a22740, 0 4px 24px rgba(0,0,0,0.6)
```

### Corner Cuts (Signature EVE detail)
Panels and key UI elements use CSS clip-path to create a clipped corner effect:
```css
clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
```
This creates the classic EVE "cut corner" on the top-right of panels.

### Buttons
```
Primary:
  bg: transparent
  border: 1px solid cyan-glow (#00d4ff)
  color: cyan-glow
  text-transform: uppercase
  letter-spacing: 0.08em
  font: Rajdhani 600
  padding: 8px 20px
  hover: bg-ghost cyan, box-shadow: 0 0 12px #00d4ff40
  active: bg: #00d4ff20

Secondary:
  border: 1px solid border-default (#1a2540)
  color: text-secondary
  hover: border-color: cyan-dim

Danger:
  border: 1px solid status-kill (#e53e3e)
  color: status-kill
  hover: bg: #e53e3e15

Disabled:
  opacity: 0.4
  cursor: not-allowed
```

### Inputs & File Upload
```
Background:   bg-void (#060810)
Border:       1px solid border-default (#1a2540)
Border-radius: 2px
Color:        text-primary
Focus:        border-color: cyan-glow, box-shadow: 0 0 0 2px #00d4ff20
Placeholder:  text-muted

File Drop Zone:
  border: 2px dashed cyan-dim (#005f80)
  background: #00d4ff08
  hover/drag-over: border-color: cyan-glow, background: #00d4ff15
  icon: upload icon in cyan-dim
  text: "DROP LOG FILES HERE" in uppercase, tracked
```

### Tables
```
Header row:
  background:    bg-panel (#0d1520)
  border-bottom: 1px solid border-default
  text:          text-secondary, uppercase, letter-spacing: 0.1em, text-sm
  font:          Rajdhani

Data rows:
  border-bottom: 1px solid border-subtle (#0f1c30)
  hover:         background: bg-elevated (#111d2e)
  font (numbers): JetBrains Mono

Alternating rows: subtle (#0a0e1480 vs transparent)

Sticky header: yes, with backdrop-filter: blur(8px)
```

### Badges / Tags
```
Default:   bg: #1a2540, color: text-secondary, border: 1px solid border-default
Cyan:      bg: #00d4ff15, color: cyan-glow, border: 1px solid #00d4ff40
Gold:      bg: #c9a22715, color: gold-bright, border: 1px solid #c9a22740
Red:       bg: #e53e3e15, color: status-kill, border: 1px solid #e53e3e40
Green:     bg: #38a16915, color: status-safe, border: 1px solid #38a16940
Shape:     border-radius: 2px (sharp), uppercase, text-xs, letter-spacing: 0.06em
```

### Navigation / Sidebar
```
Background:   bg-void (#060810)
Border-right: 1px solid border-default (#1a2540)
Width:        240px

Nav items:
  padding: 10px 16px
  color: text-secondary
  border-left: 2px solid transparent
  hover: color: text-primary, background: bg-elevated

Active item:
  color: cyan-glow
  border-left: 2px solid cyan-glow
  background: #00d4ff08

Logo area:
  height: 64px
  border-bottom: 1px solid border-default
  EVE-style wordmark: RAJDHANI 700, all-caps, with a subtle cyan underline
```

### Charts & Graphs
Using **Recharts** (React-native) or **Chart.js**:
```
Background:   transparent (sits on bg-space panels)
Grid lines:   #1a254060 (subtle, horizontal only)
Axis labels:  text-secondary, JetBrains Mono, text-xs
Tooltips:     bg-overlay (#162034), border: border-active, backdrop-blur

Line charts:  stroke: cyan-glow (#00d4ff), strokeWidth: 2
              area fill: linear gradient cyan → transparent
Bar charts:   fill: cyan-glow for primary, gold-bright for secondary
Pie/Donut:    cyan primary segment, remaining in gray tones
Kill/Loss:    kills = status-kill (#e53e3e), losses = status-safe (#38a169)

Animations:   ease-out, 600ms entrance animations
```

---

## 6. Icons

Use **Lucide React** as primary icon library:
- Clean, consistent, geometric — fits EVE's precision aesthetic
- Supplement with custom SVG icons for EVE-specific items (ships, modules)
- Icon size: `16px` (inline), `20px` (nav), `24px` (featured)
- Icon color: inherit from parent text color, or explicit accent tokens

---

## 7. Animations & Transitions

### Principles
- Subtle, purposeful — not decorative fluff
- Data loads should feel like "systems coming online"
- Fast interactions (hover: 150ms), slower reveals (page: 400ms)

### Key Animations
```css
/* Scan line reveal — for data loading */
@keyframes scanReveal {
  from { clip-path: inset(0 0 100% 0); opacity: 0; }
  to   { clip-path: inset(0 0 0% 0);   opacity: 1; }
}

/* Pulse glow — for active/live indicators */
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 4px #00d4ff80; }
  50%       { box-shadow: 0 0 12px #00d4ffcc; }
}

/* Number count-up — for stats */
/* Implemented via JS (react-countup or custom hook) */

/* Flicker — subtle, for "system boot" feel */
@keyframes flicker {
  0%, 95%, 100% { opacity: 1; }
  96%           { opacity: 0.8; }
  97%           { opacity: 1; }
  98%           { opacity: 0.7; }
}
```

### Transition Defaults
```css
transition: all 150ms ease-out;        /* hover states */
transition: all 250ms ease-in-out;     /* component state changes */
transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1); /* page reveals */
```

---

## 8. Page Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  TOPBAR (64px)  — Logo | Nav | Session info         │
├──────────┬──────────────────────────────────────────┤
│          │  PAGE HEADER (title, breadcrumb, actions)│
│ SIDEBAR  ├──────────────────────────────────────────┤
│ (240px)  │                                          │
│          │  MAIN CONTENT AREA                       │
│          │  (12-col grid, 24px gutters)             │
│          │                                          │
│          │  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│          │  │  STAT    │  │  STAT    │  │  STAT  │ │
│          │  │  CARD    │  │  CARD    │  │  CARD  │ │
│          │  └──────────┘  └──────────┘  └────────┘ │
│          │                                          │
│          │  ┌──────────────────────┐  ┌──────────┐ │
│          │  │   CHART PANEL (8col) │  │  TABLE   │ │
│          │  │                      │  │  (4col)  │ │
│          │  └──────────────────────┘  └──────────┘ │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

---

## 9. EVE-Specific UI Patterns

### Kill/Loss Indicators
- Kills: left border `status-kill` red + small skull icon
- Losses: left border `status-loss` pink-red + ship icon
- ISK values: always in JetBrains Mono with gold color, abbreviated (1.2B, 340M)

### Character/Corporation Display
- Portrait: circular, 40px, with colored ring (blue=friendly, red=hostile, green=corp)
- Corp ticker in brackets: `[BRAVE]` — monospace, text-secondary
- Alliance shown below corp in smaller text-muted

### Security Status Display
```
High-sec (1.0–0.5): status-safe green
Low-sec  (0.4–0.1): gold-bright
Null-sec (0.0):     text-secondary gray
W-space  (unknown): text-muted gray italic
```

### Log Entry Row Pattern
```
[timestamp] | [pilot name] | [ship] | [event type] | [value] | [system]
monospace     cyan-dim       text-sm   badge           gold/red   text-muted
```

---

## 10. Responsive Breakpoints

| Token  | Width   | Layout change                     |
|--------|---------|-----------------------------------|
| `sm`   | 640px   | Single column, stacked cards      |
| `md`   | 768px   | Two-column grid                   |
| `lg`   | 1024px  | Sidebar collapses to icon-only    |
| `xl`   | 1280px  | Full layout, 12-col grid          |
| `2xl`  | 1536px  | Max-width container centered      |

---

## 11. Tailwind Config Mapping

All tokens above map to a custom Tailwind config. Key extensions:

```js
// tailwind.config.ts (excerpt)
colors: {
  void:    '#060810',
  space:   '#0a0e14',
  panel:   '#0d1520',
  elevated:'#111d2e',
  overlay: '#162034',
  cyan: {
    glow: '#00d4ff',
    mid:  '#0099cc',
    dim:  '#005f80',
  },
  gold: {
    bright: '#c9a227',
    mid:    '#a07d1a',
    dim:    '#5a4510',
  },
  border: {
    DEFAULT: '#1a2540',
    active:  '#00d4ff40',
    subtle:  '#0f1c30',
  }
}
fontFamily: {
  ui:   ['Rajdhani', 'Barlow Condensed', 'sans-serif'],
  mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
}
```

---

## 12. Google Fonts Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

---

*Document version: 1.0 — 2026-02-20*
