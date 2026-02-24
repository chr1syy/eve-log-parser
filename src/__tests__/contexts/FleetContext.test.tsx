/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import {
  FleetProvider,
  useFleetSession,
  useFleetSessions,
  useFleetSessionDispatch,
} from "@/contexts/FleetContext";
import { EXAMPLE_FLEET_SESSIONS } from "@/lib/fleet/constants";
import type { FleetSession, FleetLog, FleetParticipant } from "@/types/fleet";

// Test component wrapper
function TestComponent({ children }: { children: React.ReactNode }) {
  return <FleetProvider>{children}</FleetProvider>;
}

// ────────────────────────────────────────────────────────────
// FleetProvider
// ────────────────────────────────────────────────────────────
describe("FleetProvider", () => {
  it("renders without crashing", () => {
    expect(() => {
      render(
        <FleetProvider>
          <div>Test Child</div>
        </FleetProvider>,
      );
    }).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────
// useFleetSession
// ────────────────────────────────────────────────────────────
describe("useFleetSession", () => {
  it("returns initial state (null)", () => {
    const { result } = renderHook(() => useFleetSession(), {
      wrapper: FleetProvider,
    });
    expect(result.current).toBe(null);
  });
});

// ────────────────────────────────────────────────────────────
// useFleetSessions
// ────────────────────────────────────────────────────────────
describe("useFleetSessions", () => {
  it("returns EXAMPLE_FLEET_SESSIONS initially", () => {
    const { result } = renderHook(() => useFleetSessions(), {
      wrapper: FleetProvider,
    });
    expect(result.current).toEqual(EXAMPLE_FLEET_SESSIONS);
  });
});

// ────────────────────────────────────────────────────────────
// FleetContext reducer actions
// ────────────────────────────────────────────────────────────
describe("FleetContext reducer", () => {
  it("CREATE_SESSION action adds session and sets as current", () => {
    const { result } = renderHook(
      () => ({
        session: useFleetSession(),
        sessions: useFleetSessions(),
        dispatch: useFleetSessionDispatch(),
      }),
      { wrapper: FleetProvider },
    );

    const newSession: FleetSession = {
      id: "session-new",
      code: "FLEET-NEW123" as any,
      creator: "Test Creator",
      createdAt: new Date(),
      participants: [],
      logs: [],
      tags: [],
      status: "PENDING",
    };

    act(() => {
      result.current.dispatch({ type: "CREATE_SESSION", payload: newSession });
    });

    expect(result.current.session).toEqual(newSession);
    expect(result.current.sessions).toContain(newSession);
  });

  it("JOIN_SESSION action sets current session", () => {
    const { result } = renderHook(
      () => ({
        session: useFleetSession(),
        dispatch: useFleetSessionDispatch(),
      }),
      { wrapper: FleetProvider },
    );

    const session = EXAMPLE_FLEET_SESSIONS[0];

    act(() => {
      result.current.dispatch({ type: "JOIN_SESSION", payload: session });
    });

    expect(result.current.session).toEqual(session);
  });

  it("UPLOAD_LOG action adds log to session", () => {
    const { result } = renderHook(
      () => ({
        sessions: useFleetSessions(),
        dispatch: useFleetSessionDispatch(),
      }),
      { wrapper: FleetProvider },
    );

    const sessionId = EXAMPLE_FLEET_SESSIONS[0].id;
    const log: FleetLog = {
      id: "log-new",
      sessionId,
      pilotName: "Test Pilot",
      shipType: "Test Ship",
      logData: "test log data",
      uploadedAt: new Date(),
      pilotId: "pilot-new",
    };

    act(() => {
      result.current.dispatch({
        type: "UPLOAD_LOG",
        payload: { sessionId, log },
      });
    });

    const updatedSession = result.current.sessions.find(
      (s) => s.id === sessionId,
    );
    expect(updatedSession?.logs).toContain(log);
  });

  it("context properly stores and updates session state", () => {
    const { result } = renderHook(
      () => ({
        session: useFleetSession(),
        sessions: useFleetSessions(),
        dispatch: useFleetSessionDispatch(),
      }),
      { wrapper: FleetProvider },
    );

    // Create a session
    const newSession: FleetSession = {
      id: "session-test",
      code: "FLEET-TEST" as any,
      creator: "Test Creator",
      createdAt: new Date(),
      participants: [],
      logs: [],
      tags: [],
      status: "PENDING",
    };

    act(() => {
      result.current.dispatch({ type: "CREATE_SESSION", payload: newSession });
    });
    expect(result.current.session).toEqual(newSession);

    // Join another session
    const anotherSession = EXAMPLE_FLEET_SESSIONS[1];
    act(() => {
      result.current.dispatch({
        type: "JOIN_SESSION",
        payload: anotherSession,
      });
    });
    expect(result.current.session).toEqual(anotherSession);

    // Upload a log to the current session
    const log: FleetLog = {
      id: "log-test",
      sessionId: anotherSession.id,
      pilotName: "Test Pilot",
      shipType: "Test Ship",
      logData: "test log data",
      uploadedAt: new Date(),
      pilotId: "pilot-test",
    };

    act(() => {
      result.current.dispatch({
        type: "UPLOAD_LOG",
        payload: { sessionId: anotherSession.id, log },
      });
    });
    expect(result.current.session?.logs).toContain(log);
  });
});
