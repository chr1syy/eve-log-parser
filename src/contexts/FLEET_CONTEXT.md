---
type: reference
title: Fleet Context and Hooks
created: 2026-02-24
tags:
  - fleet
  - context
  - hooks
  - react
related:
  - "[[Fleet-Feature-README]]"
  - "[[Fleet-API]]"
---

# Fleet Context

## Purpose and Structure

`FleetContext` owns in-memory session state for the fleet MVP. It provides the
current session, the session list, loading and error flags, and a reducer-driven
dispatch for updates from UI or API actions. The implementation lives in
`src/contexts/FleetContext.tsx` and is consumed through the exported hooks.

## Context Value Shape

The provider exposes this value shape via `FleetContextType`:

```ts
interface FleetContextType {
  currentSession: FleetSession | null;
  loadingSession: boolean;
  error: string | null;
  sessionsList: FleetSession[];
  dispatch: React.Dispatch<FleetAction>;
}
```

## Internal State Shape

The reducer stores a private `FleetState`:

```ts
interface FleetState {
  currentSession: FleetSession | null;
  sessions: FleetSession[];
  loading: boolean;
  error: string | null;
}
```

## Reducer Actions

Each action mutates `FleetState` inside `fleetReducer`:

```ts
type FleetAction =
  | { type: "CREATE_SESSION"; payload: FleetSession }
  | { type: "JOIN_SESSION"; payload: FleetSession }
  | { type: "UPLOAD_LOG"; payload: { sessionId: string; log: FleetLog } }
  | {
      type: "UPDATE_PARTICIPANT_STATUS";
      payload: { sessionId: string; participant: FleetParticipant };
    }
  | { type: "DELETE_SESSION"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };
```

Action intent summary:

- `CREATE_SESSION` creates a new session and sets it as current.
- `JOIN_SESSION` swaps the current session to the provided one.
- `UPLOAD_LOG` appends a log to a session and mirrors it into `currentSession`.
- `UPDATE_PARTICIPANT_STATUS` updates a participant inside a session.
- `DELETE_SESSION` removes a session and clears `currentSession` if needed.
- `SET_LOADING` toggles `loading` for async flows.
- `SET_ERROR` stores error text and ends loading.

## Exported Hooks

All hooks throw if used outside `FleetProvider`.

- `useFleetSession()` returns the active `FleetSession` or `null`.
- `useFleetSessions()` returns the full `FleetSession[]` list.
- `useFleetSessionDispatch()` returns the reducer dispatch function.

## Example Usage

```tsx
import {
  FleetProvider,
  useFleetSession,
  useFleetSessionDispatch,
} from "@/contexts/FleetContext";

function FleetStatus() {
  const session = useFleetSession();
  const dispatch = useFleetSessionDispatch();

  if (!session) return <p>No session selected.</p>;

  return (
    <section>
      <h2>{session.name}</h2>
      <button
        type="button"
        onClick={() =>
          dispatch({
            type: "SET_LOADING",
            payload: true,
          })
        }
      >
        Refresh
      </button>
    </section>
  );
}

export default function FleetPage() {
  return (
    <FleetProvider>
      <FleetStatus />
    </FleetProvider>
  );
}
```

For broader feature orientation, see [[Fleet-Feature-README]].
