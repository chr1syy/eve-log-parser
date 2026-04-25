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
- 👥 **EVE SSO Authentication** — Sign in with your EVE Online account to persist logs across devices
- 🌙 **Dark UI** — EVE-faithful dark interface inspired by the in-game HUD

---

## Quick Start

### Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org/))
- **npm** or **yarn**
- Optional: **Docker** & **Docker Compose** (for container deployment)

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
│   │   ├── api/auth/           # NextAuth (EVE SSO) route handler
│   │   ├── api/logs/           # Log CRUD API (authenticated)
│   │   ├── charts/             # Combined charts page
│   │   ├── fleet/              # Fleet analysis pages
│   │   ├── history/            # Log history page (authenticated)
│   │   ├── kills/              # Combat summary
│   │   ├── signin/             # EVE SSO sign-in page
│   │   ├── upload/             # Log upload page
│   │   └── layout.tsx          # Root layout
│   ├── components/             # Reusable React components
│   │   ├── charts/             # Chart components (Recharts)
│   │   ├── fleet/              # Fleet analysis components
│   │   └── layout/             # Layout components (sidebar, topbar)
│   ├── contexts/               # React Context (logs, auth, fleet)
│   ├── lib/
│   │   ├── analysis/           # Cap, rep, and damage analysis utilities
│   │   ├── fleet/              # Fleet session management
│   │   ├── parser/             # EVE combat log parser
│   │   └── auth.ts             # NextAuth configuration
│   └── __tests__/              # Unit & integration tests
├── data/user-logs/             # File-based log storage (per-user subdirs)
├── scripts/                    # Changelog generation
├── public/                     # Static assets
├── docker-compose.yml          # Docker services (app container)
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
npm run test:integration

# Lint code
npm run lint

# Generate changelog
npm run generate-changelog
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

## API Endpoints

- `GET /api/version` — Application version and build info
- `GET /api/changelog` — Commit history and changes
- `GET /api/logs` — List authenticated user's logs
- `POST /api/logs` — Upload a new log
- `GET /api/logs/[id]` — Fetch a specific log
- `DELETE /api/logs/[id]` — Delete a log

---

## Deployment

### Docker

The application is fully containerized and can be deployed using Docker:

```bash
# Using Docker Compose
docker-compose up -d
```

### Production with Auto-Updates

For production deployments with automatic updates:

1. See [Deployment Guide](docs/DEPLOYMENT.md)
2. See [Watchtower Setup](docs/WATCHTOWER.md)

### CI/CD

GitHub Actions automatically:

- Tests and builds on pushes
- Creates releases on version tags
- Pushes Docker images to GitHub Container Registry
- Triggers automated updates via Watchtower

---

## Configuration

Create a `.env.local` file:

```bash
# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>

# EVE SSO (for authentication)
EVE_SSO_CLIENT_ID=your_client_id_here
EVE_SSO_SECRET=your_secret_here
```

All persisted state (user logs, shared logs, fleet sessions) is stored as JSON files under `data/`. In production this directory is bind-mounted from the host (`/var/www/eve-log-parser/data` → `/app/data`) so it survives container redeploys. No database is required.

Register an EVE SSO application at [https://developers.eveonline.com](https://developers.eveonline.com). Set the callback URL to `<NEXTAUTH_URL>/api/auth/callback/eve-sso`.

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for production configuration.

---

## Testing

### Unit Tests

```bash
npm test
```

Tests cover:

- Log parsing accuracy (damage, reps, e-war, shield/armor events)
- DPS calculations and damage aggregation
- Auth utilities and session handling
- NPC filtering logic

### Integration Tests

```bash
npm run test:integration
```

Tests cover:

- Full upload → analysis flow
- UI interactions and chart updates
- Table sorting/filtering
- Authenticated and anonymous upload paths

### Manual Testing

**Sample Log Files**
Test logs are included in `data/`:

- Mixed weapon + drone damage
- NPC attacks + player attacks
- Remote repair events (armor and shield)
- Capacitor drain events

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Setting up a development environment
- Code style and standards
- Submitting issues and pull requests
- Reporting bugs

---

## Roadmap

### In Progress

- [ ] Fleet combat log analysis
- [ ] Advanced e-war analytics (jam events, neut effectiveness)

### Planned

- [ ] Alliance/coalition battle statistics
- [ ] Log comparison & before/after analysis
- [ ] Real-time combat overlay (external tool)
- [ ] Export to CSV/JSON for external analysis

---

## Architecture & Design

### Weapon Systems Reference

Combat mechanics are documented in [AGENTS.md](AGENTS.md), including:

- Damage types and resistances
- Weapon categories (turrets, missiles, drones)
- Accuracy models and range
- Electronic warfare module behavior
- Parsing guidance for agents

---

## Troubleshooting

### Log Not Parsing

- Verify the file is a `.txt` file from EVE Online (Settings > Logs & Market Logs)
- Check file format: each line should start with `[YYYY.MM.DD HH:MM:SS]`

### Missing Data

- Ensure combat log was captured in the correct location:
  - Windows: `%LOCALAPPDATA%\CCP\EVE\logs\Chatlogs\`
  - macOS: `~/Library/Caches/CCP/EVE/logs/Chatlogs/`
  - Linux: `~/.ccp/eve/logs/Chatlogs/`

---

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/chr1syy/eve-log-parser/issues)
- **Discussions**: [GitHub Discussions](https://github.com/chr1syy/eve-log-parser/discussions)

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) file for details.

**EVE Online** is a trademark of CCP Games ehf. All EVE Online imagery and lore are property of CCP Games. This tool is fan-made and not affiliated with, endorsed by, or connected to CCP Games.

---

**Made by capsuleers, for capsuleers. 🚀**
