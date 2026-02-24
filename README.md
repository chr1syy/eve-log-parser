# EVE Log Parser

> Advanced combat log analysis tool for EVE Online pilots. Parse, visualize, and analyze your combat logs with professional-grade analytics and insights.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black)

---

## Overview

EVE Log Parser transforms raw EVE Online combat logs into actionable intelligence. Whether you're evaluating your PvP performance, analyzing fleet engagements, or tuning your ship fit, this tool provides the insights you need.

**Key Features:**

- 📊 **Real-time DPS Analysis** — Visualize damage application over time with interactive charts
- 🎯 **Weapon Performance Metrics** — Track hit quality, accuracy, and damage per weapon type
- 🛡️ **Defensive Analysis** — Monitor incoming damage, repair throughput, and tank effectiveness
- 🚁 **Drone Intelligence** — Separate drone performance from turret/missile effectiveness
- 🔍 **Combat Timeline** — See exactly when weapons fired, e-war applied, and repairs cycled
- 👥 **Multi-Character Support** — Persistent log storage with character authentication (coming soon)
- 🌙 **Dark UI** — EVE-faithful dark interface inspired by the in-game HUD

---

## Quick Start

### Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org/))
- **npm** or **yarn**
- Optional: **Docker** & **Docker Compose** (for PostgreSQL + container deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/chr1syy/eve-log-parser.git
cd eve-log-parser

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Upload a Combat Log

1. Navigate to the **Upload** page
2. Drag & drop a `.txt` combat log file, or click to select one
3. Parser automatically extracts:
   - Damage dealt (by weapon/drone)
   - Damage taken (incoming attacks)
   - Electronic warfare (jams, neutralizers, webs)
   - Repairs and support modules
   - Combat timeline

4. View analysis across multiple tabs:
   - **Damage Application** — Outgoing DPS and accuracy
   - **Damage Mitigation** — Incoming threats and tank performance
   - **Kills** — ISK destroyed and combat summary
   - **Capacitor** — Energy management and neutralizer effects
   - **Repairs** — Logistics and support analysis

---

## Project Structure

```
eve-log-parser/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── damage-dealt/       # Outgoing damage analysis
│   │   ├── damage-taken/       # Incoming damage & mitigation
│   │   ├── kills/              # Combat summary
│   │   ├── api/                # Backend endpoints
│   │   └── layout.tsx          # Root layout
│   ├── components/             # Reusable React components
│   │   ├── charts/             # Chart components (Recharts)
│   │   ├── tables/             # Data tables & grids
│   │   └── layout/             # Layout components (sidebar, topbar)
│   ├── contexts/               # React Context (logs, auth)
│   ├── lib/
│   │   ├── parser/             # Combat log parsing engine
│   │   │   └── eveLogParser.ts # Main parser regex & logic
│   │   ├── analysis/           # Data analysis functions
│   │   │   ├── damageDealt.ts  # Outgoing DPS analysis
│   │   │   ├── damageTaken.ts  # Incoming damage analysis
│   │   │   ├── capAnalysis.ts  # Capacitor tracking
│   │   │   └── repAnalysis.ts  # Repair throughput
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── utils.ts            # Utilities
│   │   └── npcFilter.ts        # NPC entity filtering
│   └── __tests__/              # Unit & integration tests
├── public/                     # Static assets
├── docker-compose.yml          # Docker services (PostgreSQL)
├── tailwind.config.ts          # Tailwind CSS config
├── tsconfig.json               # TypeScript config
├── vitest.config.ts            # Test config
└── package.json
```

---

## Development

### Scripts

```bash
# Development server (hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run tests
npm test

# Run integration tests
npm test:integration

# Lint code
npm run lint

# Type check
npm run type-check
```

### Architecture

**Log Parsing** (`src/lib/parser/eveLogParser.ts`)

- Regex-based extraction of combat events
- Handles color tags, timestamps, and entity names
- Produces `LogEntry[]` with structured data (damage, weapon, ship type, etc.)

**Analysis** (`src/lib/analysis/`)

- Time-series DPS calculation
- Hit quality breakdown (Misses, Grazes, Hits, Penetrates, Smashes, Wrecks)
- Per-weapon and per-target aggregation
- Bad hit percentage (Misses + Grazes / Total Hits)

**UI** (React + Next.js + Recharts)

- Interactive charts with zoom/pan
- Sortable tables with filtering
- Dark EVE-inspired design system (Tailwind CSS)

---

## Features in Detail

### Damage Application Tab

- **DPS Line Chart** — Real-time damage output over time with zoom support
- **Weapon Summary Table** — Per-weapon statistics (hits, misses, damage range)
- **Target Summary Table** — Per-target breakdown (by ship/pilot)
- **Drone Filter Toggle** — Exclude drones to analyze weapon accuracy independently
- **Hit Quality Breakdown** — Visual distribution of hit outcomes

### Damage Mitigation Tab

- **Incoming Weapons Table** — Attackers, their ships, and weapon used
- **Incoming Drones Table** — Drone damage sources with ship types
- **Bad Hit Analysis** — Your tank's effectiveness (% of shots missed/glanced)
- **NPC vs Player Filtering** — Separate NPC damage from player attacks
- **DPS Mitigation Metrics** — Armor/shield/hull tank analysis

### Kills Tab

- **Combat Summary** — ISK destroyed, kill count, ISK lost
- **Engagement Timeline** — Visual representation of combat duration
- **Kill Details** — Pilot, corporation, ship destroyed, and ISK value

### Capacitor Tab

- **Capacitor Timeline** — Energy level throughout combat
- **Neutralizer Events** — Energy drained by hostile neuts
- **Repair Costs** — Energy expended on module cycles

### Repairs Tab

- **Remote Armor Repair** — Incoming logistics support
- **Self-Repairs** — Armor/shield repair cycles
- **Throughput Analysis** — Repair rate over time

---

## Data Privacy & Session Management

### Anonymous Mode (Default)

- Single combat log stored in browser `localStorage`
- No server-side storage
- Automatic clearing when session ends
- Fallback: Server-side session storage (regenerated per session)

### Authenticated Mode (Optional)

- EVE SSO integration for character verification
- Persistent log storage with PostgreSQL
- Multi-character log history
- Cross-device log access
- (Coming soon — see roadmap)

---

## Configuration

### Environment Variables

Create a `.env.local` file (copy from `.env.local.example`):

```bash
# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>

# EVE SSO (optional, for authentication)
EVE_SSO_CLIENT_ID=your_client_id_here
EVE_SSO_SECRET=your_secret_here

# Database (optional, for multi-character support)
DATABASE_URL=postgresql://user:password@localhost:5432/eve_logs
```

See `DEPLOYMENT.md` for production configuration.

---

## Testing

### Unit Tests

```bash
npm test
```

Tests cover:

- Log parsing accuracy
- DPS calculations
- Damage aggregation
- Bad hit percentages
- NPC filtering logic

### Integration Tests

```bash
npm test:integration
```

Tests cover:

- Full upload → analysis flow
- UI interactions
- Chart updates
- Table sorting/filtering

### Manual Testing

**Sample Log Files**
Test logs are included in `data/sample-logs/`:

- Mixed weapon + drone damage
- NPC attacks + player attacks
- Remote repair events
- Capacitor drain events

```bash
# Upload a sample log via the UI at http://localhost:3000/upload
```

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Setting up a development environment
- Code style and standards
- Submitting issues and pull requests
- Reporting bugs

### Quick Start for Contributors

```bash
# 1. Fork the repository (GitHub)
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/eve-log-parser.git
cd eve-log-parser

# 3. Create a feature branch
git checkout -b feat/your-feature-name

# 4. Make changes, test, commit
npm test && npm run lint

# 5. Push and open a Pull Request
git push origin feat/your-feature-name
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## Roadmap

### In Progress

- [ ] EVE SSO authentication (next-auth + PostgreSQL)
- [ ] Multi-character log persistence
- [ ] Log history browser
- [ ] Fleet combat log analysis

### Planned

- [ ] Shield repair tracking
- [ ] Advanced e-war analytics (jam events, neut effectiveness)
- [ ] Alliance/coalition battle statistics
- [ ] Log comparison & before/after analysis
- [ ] Real-time combat overlay (external tool)
- [ ] Export to CSV/JSON for external analysis

### Experimental

- [ ] AI-powered combat recommendations
- [ ] Loadout optimizer based on combat data
- [ ] Multi-log battle reconstruction

---

## Architecture & Design

### Design System

EVE Log Parser uses an EVE Online-inspired dark UI. See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for:

- Color palette (cyan/gold accents)
- Typography (Rajdhani + JetBrains Mono)
- Component patterns (panels, badges, tables)
- Layout grid and spacing
- Animation principles

### Weapon Systems Reference

Combat mechanics are documented in [AGENTS.md](AGENTS.md), including:

- Damage types and resistances
- Weapon categories (turrets, missiles, drones)
- Accuracy models and range
- Electronic warfare module behavior
- Parsing guidance for agents

---

## Performance Considerations

- **Large Logs**: Logs 10MB+ may take 5-10 seconds to parse
- **Browser Storage**: localStorage limited to ~5MB; use authenticated mode for persistent storage
- **Chart Performance**: 100k+ data points may cause lag; zoom to focus on specific time window
- **Table Rendering**: 1000+ rows virtualized for performance

---

## Troubleshooting

### Log Not Parsing

- Verify the file is a `.txt` file from EVE Online (Settings > Logs & Market Logs)
- Check file format: each line should start with `[YYYY.MM.DD HH:MM:SS]`
- If using outdated EVE client, certain log formats may be unsupported

### Chart Not Rendering

- Clear browser cache and reload
- Try a different log file to isolate the issue
- Open browser DevTools (F12) → Console for error messages

### Missing Data

- Ensure combat log was captured in the correct location:
  - Windows: `%LOCALAPPDATA%\CCP\EVE\logs\Chatlogs\`
  - macOS: `~/Library/Caches/CCP/EVE/logs/Chatlogs/`
  - Linux: `~/.ccp/eve/logs/Chatlogs/`

### Performance Issues

- Close other tabs/applications
- Try a smaller log file (first 1000 lines)
- Enable hardware acceleration in browser settings

---

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/chr1syy/eve-log-parser/issues)
- **Discussions**: [GitHub Discussions](https://github.com/chr1syy/eve-log-parser/discussions)
- **Discord**: (Coming soon)
- **EVE Forums**: (Coming soon)

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) file for details.

**EVE Online** is a trademark of CCP Games ehf. All EVE Online imagery and lore are property of CCP Games. This tool is fan-made and not affiliated with, endorsed by, or connected to CCP Games.

---

## Acknowledgments

- **CCP Games** for EVE Online and the combat log format
- **Recharts** for beautiful React charts
- **Tailwind CSS** for rapid UI development
- **EVE Community** for feedback and combat logs
- Contributors and testers

---

## Roadmap for Contributors

Interested in contributing? Start with:

1. **Good First Issues** — tagged in GitHub Issues
2. **Parser Improvements** — handling edge cases in combat logs
3. **Analysis Features** — new metrics and visualizations
4. **UI/UX** — design refinements and accessibility
5. **Documentation** — expand guides and examples

---

**Made by capsuleers, for capsuleers. 🚀**

_Last updated: 2026-02-23_
