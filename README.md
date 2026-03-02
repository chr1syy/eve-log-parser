# EVE Log Parser

A Next.js web application for parsing and analyzing EVE Online combat logs. Upload your game logs to visualize damage dealt, damage taken, capacitor pressure, and more — with optional persistent storage via EVE SSO authentication.

## Features

- **Log Parsing** — Upload EVE Online combat log files for instant analysis
- **Damage Dealt** — Per-weapon DPS charts, hit outcome distributions, and actor breakdowns
- **Damage Taken** — Incoming damage timeline and DPS analysis
- **Capacitor Pressure** — Energy neutralizer and cap warfare event tracking
- **Log History** — Authenticated users can store and revisit past logs across devices
- **EVE SSO Authentication** — Sign in with your EVE Online account via OAuth 2.0; no separate password required
- **Anonymous Mode** — Parse and analyze logs without signing in; data stays local

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [NextAuth v5](https://authjs.dev) with EVE Online SSO provider
- [PostgreSQL](https://www.postgresql.org) via `pg` + `@auth/pg-adapter` for session and log storage
- [Recharts](https://recharts.org) for data visualization
- [Tailwind CSS v4](https://tailwindcss.com)
- [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) for unit and integration tests

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or Docker)

### 1. Clone and install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret for NextAuth (generate with `openssl rand -hex 32`) |
| `EVE_CLIENT_ID` | EVE Online SSO application client ID |
| `EVE_CLIENT_SECRET` | EVE Online SSO application client secret |
| `NEXTAUTH_URL` | Full URL of the app (e.g. `http://localhost:3000`) |

Register an EVE SSO application at [https://developers.eveonline.com](https://developers.eveonline.com). Set the callback URL to `<NEXTAUTH_URL>/api/auth/callback/eve-sso`.

### 3. Start PostgreSQL

Using Docker Compose:

```bash
docker compose up -d db
```

Or point `DATABASE_URL` at an existing PostgreSQL instance.

### 4. Initialize the database schema

```bash
node scripts/init-db.js
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Running Tests

```bash
npm test
```

Tests cover auth utilities, database functions, upload flow, log history, and integration scenarios including anonymous and authenticated upload paths.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages and API routes
│   ├── api/auth/         # NextAuth route handler
│   ├── api/logs/         # Log CRUD API (authenticated)
│   ├── damage-dealt/     # Damage dealt analysis page
│   ├── damage-taken/     # Damage taken analysis page
│   ├── cap-pressure/     # Capacitor pressure page
│   ├── history/          # Log history page (authenticated)
│   ├── signin/           # EVE SSO sign-in page
│   └── upload/           # Log upload page
├── components/           # Shared UI components (Sidebar, Topbar, charts)
├── contexts/             # React contexts (AuthContext, LogsContext)
├── hooks/                # Custom hooks (useShareLog, etc.)
├── lib/
│   ├── analysis/         # Cap, rep, and damage analysis utilities
│   ├── db/               # PostgreSQL client and log DB functions
│   ├── parser/           # EVE combat log parser
│   └── auth.ts           # NextAuth configuration
scripts/
└── init-db.js            # Database schema initialization script
```

## Authentication Flow

1. User clicks "Sign In with EVE Online" on the signin page
2. Redirected to EVE Online's OAuth 2.0 endpoint
3. After authorization, EVE SSO returns an access token with character info
4. NextAuth stores the session in PostgreSQL; character ID, name, and corporation ID are added to the session token
5. Authenticated users gain access to persistent log storage and the history page

## License

MIT
