---
type: reference
title: Fleet Test Guide
created: 2026-02-24
tags:
  - fleet
  - tests
  - documentation
related:
  - "[[Fleet Feature Module Overview]]"
---

# Fleet Test Guide

## Run Tests

- All fleet unit tests: `npm test -- src/__tests__/fleet/`
- Fleet e2e workflow: `npm test -- src/__tests__/e2e/fleet-workflow.test.ts`
- Fleet API tests: `npm test -- src/__tests__/api/`

## Add New Test Cases

1. Mirror the `src/` structure under `src/__tests__/`.
2. Use Vitest (`describe`, `it`, `expect`) and Testing Library for React components.
3. Keep test setup small and explicit (local helpers, inline fixtures where possible).

Template (unit test):

```ts
import { describe, it, expect } from "vitest";
import { yourFunction } from "@/lib/fleet/yourModule";

describe("yourModule", () => {
  it("does the expected thing", () => {
    const result = yourFunction(/* inputs */);
    expect(result).toEqual(/* expected */);
  });
});
```

Template (component test):

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import YourComponent from "@/components/fleet/YourComponent";

describe("YourComponent", () => {
  it("renders expected UI", () => {
    render(<YourComponent />);
    expect(screen.getByText("...")).toBeInTheDocument();
  });
});
```

## Fixture Data

- Fleet log fixtures live in `src/__tests__/fixtures/fleet-logs/`.

## Mocking Patterns

- API routes: mock `next/server` to stub `NextRequest` and `NextResponse`, and reset in `beforeEach`.
  - Example: `src/__tests__/api/fleet-sessions.test.ts`
- Fetch-based UI calls: set `global.fetch = vi.fn()` and define `mockResolvedValueOnce`.
  - Example: `src/__tests__/components/fleet/LogUploadForm.test.tsx`
- Context hooks: use `FleetProvider` as the wrapper for `renderHook` and call `act` for dispatch.
  - Example: `src/__tests__/contexts/FleetContext.test.tsx`

## Naming Convention

- Match the `src/` structure and keep file names as `*.test.ts` or `*.test.tsx`.
- Examples:
  - `src/components/fleet/FleetOverviewTab.tsx` -> `src/__tests__/components/fleet/FleetOverviewTab.test.tsx`
  - `src/lib/fleet/participantStats.ts` -> `src/__tests__/fleet/participant-stats.test.ts`
