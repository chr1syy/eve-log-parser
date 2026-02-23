"use client";

import { createContext, useContext, useReducer, type ReactNode } from "react";

import type { FleetSession, FleetLog, FleetParticipant } from "@/types/fleet";
import { EXAMPLE_FLEET_SESSIONS } from "@/lib/fleet/constants";

interface FleetState {
  currentSession: FleetSession | null;
  sessions: FleetSession[];
  loading: boolean;
  error: string | null;
}

type FleetAction =
  | { type: "CREATE_SESSION"; payload: FleetSession }
  | { type: "JOIN_SESSION"; payload: FleetSession }
  | { type: "UPLOAD_LOG"; payload: { sessionId: string; log: FleetLog } }
  | {
      type: "UPDATE_PARTICIPANT_STATUS";
      payload: { sessionId: string; participant: FleetParticipant };
    }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

function fleetReducer(state: FleetState, action: FleetAction): FleetState {
  switch (action.type) {
    case "CREATE_SESSION":
      return {
        ...state,
        sessions: [...state.sessions, action.payload],
        currentSession: action.payload,
        loading: false,
        error: null,
      };
    case "JOIN_SESSION":
      return {
        ...state,
        currentSession: action.payload,
        loading: false,
        error: null,
      };
    case "UPLOAD_LOG":
      const updatedSessions = state.sessions.map((sess) =>
        sess.id === action.payload.sessionId
          ? { ...sess, logs: [...sess.logs, action.payload.log] }
          : sess,
      );
      return {
        ...state,
        sessions: updatedSessions,
        currentSession:
          state.currentSession?.id === action.payload.sessionId
            ? {
                ...state.currentSession,
                logs: [
                  ...(state.currentSession.logs || []),
                  action.payload.log,
                ],
              }
            : state.currentSession,
      };
    case "UPDATE_PARTICIPANT_STATUS":
      const upSessions = state.sessions.map((sess) =>
        sess.id === action.payload.sessionId
          ? {
              ...sess,
              participants: sess.participants.map((p) =>
                p.pilotName === action.payload.participant.pilotName
                  ? action.payload.participant
                  : p,
              ),
            }
          : sess,
      );
      return {
        ...state,
        sessions: upSessions,
        currentSession:
          state.currentSession?.id === action.payload.sessionId
            ? {
                ...state.currentSession,
                participants: state.currentSession.participants.map((p) =>
                  p.pilotName === action.payload.participant.pilotName
                    ? action.payload.participant
                    : p,
                ),
              }
            : state.currentSession,
      };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

export interface FleetContextType {
  currentSession: FleetSession | null;
  loadingSession: boolean;
  error: string | null;
  sessionsList: FleetSession[];
  dispatch: React.Dispatch<FleetAction>;
}

const FleetContext = createContext<FleetContextType | null>(null);

export function FleetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(fleetReducer, {
    currentSession: null,
    sessions: EXAMPLE_FLEET_SESSIONS,
    loading: false,
    error: null,
  });

  const value: FleetContextType = {
    currentSession: state.currentSession,
    loadingSession: state.loading,
    error: state.error,
    sessionsList: state.sessions,
    dispatch,
  };

  return (
    <FleetContext.Provider value={value}>{children}</FleetContext.Provider>
  );
}

export function useFleetSession() {
  const ctx = useContext(FleetContext);
  if (!ctx)
    throw new Error("useFleetSession must be used within FleetProvider");
  return ctx.currentSession;
}

export function useFleetSessions() {
  const ctx = useContext(FleetContext);
  if (!ctx)
    throw new Error("useFleetSessions must be used within FleetProvider");
  return ctx.sessionsList;
}

export function useFleetSessionDispatch() {
  const ctx = useContext(FleetContext);
  if (!ctx)
    throw new Error(
      "useFleetSessionDispatch must be used within FleetProvider",
    );
  return ctx.dispatch;
}
