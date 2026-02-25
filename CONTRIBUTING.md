# Contributing to EVE Log Parser

Thank you for your interest in contributing to EVE Log Parser! This document provides guidelines and instructions for contributing.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing](#testing)
6. [Commit Messages](#commit-messages)
7. [Pull Request Process](#pull-request-process)
8. [Issue Guidelines](#issue-guidelines)
9. [Architecture & Patterns](#architecture--patterns)
10. [Performance Considerations](#performance-considerations)

---

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to:

- Be respectful and inclusive of all contributors
- Provide constructive feedback
- Focus on the code, not the person
- Help maintain a welcoming environment

Violations can be reported to the project maintainers.

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **Git**
- **npm** or **yarn**
- Basic familiarity with TypeScript, React, and Next.js

### Setup Development Environment

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/eve-log-parser.git
cd eve-log-parser

# 3. Add upstream remote (for syncing)
git remote add upstream https://github.com/chr1syy/eve-log-parser.git

# 4. Install dependencies
npm install

# 5. Start development server
npm run dev

# 6. Verify everything works
npm test
```

Visit [http://localhost:3000](http://localhost:3000) to confirm the app runs.

---

## Development Workflow

### Creating a Feature Branch

```bash
# Sync with upstream main
git fetch upstream
git checkout main
git merge upstream/main

# Create a feature branch
git checkout -b feat/descriptive-feature-name

# Or for bug fixes
git checkout -b fix/descriptive-bug-name
```

### Branch Naming Conventions

- **Features**: `feat/feature-description` (e.g., `feat/add-drone-filter-toggle`)
- **Bug Fixes**: `fix/bug-description` (e.g., `fix/parser-missing-drone-damage`)
- **Refactoring**: `refactor/description` (e.g., `refactor/analysis-module`)
- **Documentation**: `docs/description` (e.g., `docs/add-deployment-guide`)
- **Tests**: `test/description` (e.g., `test/add-parser-edge-cases`)

### Making Changes

1. **Create/modify files** in your feature branch
2. **Write tests** for new functionality
3. **Update documentation** if user-facing changes
4. **Run tests and lint** before committing

```bash
# Run tests
npm test

# Run linter
npm run lint

# Type check
npm run type-check

# Build to catch errors
npm run build
```

### Keeping Your Branch Up-to-Date

```bash
# Fetch upstream changes
git fetch upstream

# Rebase your branch on upstream/main
git rebase upstream/main

# If there are conflicts, resolve them and continue
git rebase --continue

# Force push your branch (after rebasing)
git push --force-with-lease origin feat/your-feature-name
```

---

## Coding Standards

### TypeScript

- **Strict mode**: All files must pass strict TypeScript checking
- **Types**: Avoid `any`; use explicit types or inferred generics
- **Interfaces**: Prefer interfaces for public APIs
- **Naming**: PascalCase for types/interfaces, camelCase for variables/functions

```typescript
// Good
interface LogEntry {
  timestamp: string;
  damage: number;
  isDrone: boolean;
}

function parseCombatLog(logText: string): LogEntry[] {
  // implementation
}

// Avoid
const data: any = {};
function parse(log) {
  // no type info
}
```

### React Components

- **Functional Components**: Use function syntax, not class components
- **Hooks**: Use React hooks for state management
- **Props Typing**: Always type component props with interfaces

```typescript
// Good
interface DamageTableProps {
  entries: DamageEntry[];
  onSort?: (field: keyof DamageEntry) => void;
  isLoading?: boolean;
}

export function DamageTable({ entries, onSort, isLoading }: DamageTableProps) {
  return <div>{/* component */}</div>;
}

// Avoid
export function DamageTable(props) {
  // no type info
}
```

### File Organization

```
src/
├── app/                   # Next.js pages/routes
│   └── feature-name/      # Feature-specific routes
├── components/            # Reusable React components
│   └── FeatureName.tsx    # One component per file
├── lib/
│   ├── analysis/          # Business logic
│   │   └── featureName.ts
│   └── types.ts           # Shared types
└── __tests__/             # Tests co-located with source
    └── lib/
        └── analysis/
            └── featureName.test.ts
```

### CSS & Styling

- **Tailwind CSS**: Use Tailwind utility classes for all styling
- **Custom CSS**: Keep in Tailwind config; avoid arbitrary values when possible
- **Design System**: Follow [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

```typescript
// Good
<div className="bg-space border border-default rounded-sm p-4">
  Content
</div>

// Use Tailwind from config
<button className="bg-cyan-glow text-void hover:bg-cyan-mid transition-colors">
  Click me
</button>
```

### Naming Conventions

| Item             | Convention          | Example                 |
| ---------------- | ------------------- | ----------------------- |
| Components       | PascalCase          | `DamageDealtChart.tsx`  |
| Functions        | camelCase           | `calculateDPS()`        |
| Constants        | UPPER_SNAKE_CASE    | `MAX_ZOOM_LEVEL`        |
| Types/Interfaces | PascalCase          | `DamageEntry`           |
| Enums            | PascalCase          | `HitQuality`            |
| Booleans         | prefix `is/has/can` | `isLoading`, `hasError` |

### Comments

- **Why, not what**: Comments explain the reasoning, not the code
- **TODOs**: Include issue number: `// TODO (#123): implement feature`
- **Complex logic**: Comment before blocks of logic

```typescript
// Good
// Filter out drone hits to show weapon accuracy independently
const weaponDamage = entries.filter((e) => !e.isDrone);

// Avoid
// Loop through entries
entries.forEach((e) => {});

// Good: Explains the non-obvious reason
// Exclude NPC damage from player statistics (Issue #8)
if (e.isPilot || !e.isNPC) {
  // process
}
```

---

## Testing

### Test Files

- **Location**: Co-located with source (`src/__tests__/`)
- **Naming**: `[module].test.ts` for unit tests, `[module].integration.test.ts` for integration tests
- **Framework**: Vitest

### Writing Tests

```typescript
// src/__tests__/lib/analysis/damageDealt.test.ts
import { describe, it, expect } from "vitest";
import { generateDamageDealtTimeSeries } from "@/lib/analysis/damageDealt";

describe("generateDamageDealtTimeSeries", () => {
  it("should exclude drone damage when excludeDrones=true", () => {
    const entries = [
      { isDrone: false, damage: 100 },
      { isDrone: true, damage: 50 },
    ];

    const result = generateDamageDealtTimeSeries(entries, undefined, true);

    expect(result.totalDamage).toBe(100); // Only weapon damage
  });

  it("should include drones by default", () => {
    const entries = [
      { isDrone: false, damage: 100 },
      { isDrone: true, damage: 50 },
    ];

    const result = generateDamageDealtTimeSeries(entries);

    expect(result.totalDamage).toBe(150); // All damage
  });
});
```

### Test Coverage

- **Target**: 80%+ coverage for critical paths (parsing, analysis)
- **Run tests**: `npm test`
- **Integration tests**: `npm test:integration`

### Testing Guidelines

- ✅ Test edge cases (empty logs, single entry, large logs)
- ✅ Test error handling (invalid input, parsing failures)
- ✅ Mock external dependencies
- ❌ Don't test implementation details (test behavior)
- ❌ Don't mock large sections of the app

---

## Commit Messages

### Format

Use clear, descriptive commit messages:

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring (no behavior change)
- `perf`: Performance improvement
- `test`: Test additions/updates
- `docs`: Documentation changes
- `ci`: CI/CD changes
- `style`: Code style changes (formatting, linting)

### Examples

```bash
# Good
git commit -m "feat(parser): add support for remote armor repair events

Add parsing for remote armor repair log lines. Handles both incoming
and outgoing repairs with per-tick damage values."

git commit -m "fix(damage-chart): exclude drones when filter toggled (#13)

Fixes DPS calculation to respect excludeDrones parameter."

git commit -m "test(analysis): add edge case tests for empty logs"

# Avoid
git commit -m "fix stuff"
git commit -m "Update code"
git commit -m "WIP: work in progress"
```

---

## Pull Request Process

### Before Submitting

1. **Ensure tests pass**:

   ```bash
   npm test && npm run lint && npm run type-check && npm run build
   ```

2. **Rebase on latest main**:

   ```bash
   git fetch upstream
   git rebase upstream/main
   git push --force-with-lease origin feat/your-feature
   ```

3. **Update documentation** if needed (README, DESIGN_SYSTEM.md, etc.)

4. **Add tests** for new functionality

### Creating a Pull Request

1. Go to GitHub and create a PR from your fork to `upstream/main`

2. **Title**: Use the same format as commit messages

   ```
   feat(parser): add remote armor repair support
   fix(charts): fix drone filter not updating DPS
   ```

3. **Description**: Include:
   - What the PR does
   - Why it's needed (link to issue if applicable)
   - Any breaking changes
   - Testing instructions (if manual testing needed)

```markdown
## Description

Adds a toggle to filter drone damage from the damage-dealt chart, allowing
pilots to analyze weapon accuracy independently.

Fixes #13

## Changes

- Add `excludeDrones` parameter to `generateDamageDealtTimeSeries()`
- Add toggle button in damage-dealt page header
- Update chart tooltip to show filtering status
- Add unit tests for filter logic

## Testing

1. Upload a log with mixed weapon + drone damage
2. Click toggle button
3. Verify DPS line changes and bad hit % recalculates
4. Run `npm test` to verify all tests pass
```

4. **Request Review**: Tag a maintainer if you know them

### Review Feedback

- Respond to all comments
- Make requested changes in new commits (don't squash immediately)
- Re-request review after changes

### Merging

Once approved:

- Maintainer will squash and merge your PR
- Your feature branch is deleted
- You're automatically added to the contributors list

---

## Issue Guidelines

### Reporting Bugs

Use the bug template and include:

- **Description**: What's broken?
- **Steps to Reproduce**: How do I see the bug?
- **Expected Behavior**: What should happen?
- **Actual Behavior**: What actually happens?
- **Environment**: OS, Node version, browser
- **Log File**: If applicable, attach a sample log (sanitized)

### Requesting Features

Use the feature template and include:

- **Problem**: What problem does this solve?
- **Proposed Solution**: How should this work?
- **Alternatives**: Other approaches considered?
- **Use Case**: Why is this important?

### Labels

- `bug`: Something is broken
- `enhancement`: New feature
- `good first issue`: Good for new contributors
- `help wanted`: Maintainers need assistance
- `documentation`: Documentation updates needed
- `discussion`: Discussion needed before implementation
- `wontfix`: Not planned for this project

---

## Architecture & Patterns

### Parser Module (`src/lib/parser/`)

The parser converts raw EVE log text into structured `LogEntry[]` objects.

**Key Functions:**

- `parseEveLogs(text: string): LogEntry[]` — Main entry point
- `stripHTMLTags(text: string): string` — Preprocess color/formatting
- `extractCombatLine(line: string): LogEntry | null` — Parse individual combat event

**Extending the Parser:**

1. Add new regex pattern for log line type
2. Extract fields into `LogEntry` object
3. Add test case in `src/__tests__/parser.test.ts`
4. Update `AGENTS.md` if adding new event type

### Analysis Module (`src/lib/analysis/`)

Analysis functions transform parsed logs into metrics.

**Pattern:**

```typescript
export function analyzeFeature(entries: LogEntry[]): FeatureAnalysis {
  // Filter relevant entries
  const relevant = entries.filter((e) => e.eventType === "feature");

  // Aggregate data
  const result = summarize(relevant);

  // Return structured result
  return result;
}
```

**Adding New Analysis:**

1. Create `src/lib/analysis/featureName.ts`
2. Export types and analysis function
3. Import in `src/lib/analysis/index.ts`
4. Use in page components
5. Add tests in `src/__tests__/lib/analysis/`

### UI Components

**Page Components** (`src/app/*/page.tsx`):

- Accept `ParsedLog` from context
- Call analysis functions
- Render charts and tables
- Handle user interactions (zoom, filter, sort)

**Reusable Components** (`src/components/`):

- Accept props for data and callbacks
- No business logic (except UI state)
- Follow EVE design system
- Document props with JSDoc

```typescript
interface ChartProps {
  data: TimeSeriesPoint[];
  title: string;
  onZoom?: (start: number, end: number) => void;
  excludeDrones?: boolean;
}

export function Chart({ data, title, onZoom, excludeDrones }: ChartProps) {
  // component
}
```

---

## Performance Considerations

### Parsing Performance

- Large logs (10MB+) may take 5-10 seconds
- Regex performance is critical — avoid backtracking
- Consider streaming for very large files

### Memory Usage

- `localStorage` limited to ~5MB
- For larger logs, use authenticated mode (PostgreSQL)
- Minimize chart data points in view (aggregation/downsampling)

### Rendering Performance

- Virtualize large tables (1000+ rows)
- Memoize expensive calculations (`useMemo`)
- Lazy-load chart data off-screen
- Use Recharts efficiently (avoid 100k+ data points)

### Testing Performance

```bash
# Benchmark parsing
npm run test -- --reporter=verbose src/__tests__/parser.test.ts

# Profile builds
npm run build -- --profile
```

---

## Resources

- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **React Documentation**: https://react.dev
- **Next.js Documentation**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Vitest**: https://vitest.dev
- **EVE Online**: https://www.eveonline.com

---

## Getting Help

- **Questions**: Open a GitHub Discussion or issue
- **Chat**: (Coming soon — Discord)
- **Documentation**: Check [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) and [AGENTS.md](AGENTS.md)

---

## Recognition

Contributors are recognized in:

- GitHub Contributor graph
- Project README (if desired)
- Release notes

Thank you for contributing! 🚀

---

_Last updated: 2026-02-23_
