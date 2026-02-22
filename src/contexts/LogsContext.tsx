"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { ParsedLog } from "@/lib/types";

const STORAGE_KEY = "eve-parsed-logs";
const ACTIVE_SESSION_KEY = "eve-active-session";

export interface LogsContextValue {
  logs: ParsedLog[];
  activeLog: ParsedLog | null;
  setActiveLog: (log: ParsedLog) => void;
  removeLog: (sessionId: string) => void;
  clearLogs: () => void;
}

interface LogsState {
  logs: ParsedLog[];
  activeSessionId: string | null;
}

type LogsAction =
  | { type: "SET_ACTIVE_LOG"; payload: ParsedLog }
  | {
      type: "HYDRATE_FROM_STORAGE";
      payload: { logs: ParsedLog[]; activeSessionId: string | null };
    }
  | { type: "REMOVE_LOG"; payload: string }
  | { type: "CLEAR_LOGS" };

function logsReducer(state: LogsState, action: LogsAction): LogsState {
  switch (action.type) {
    case "SET_ACTIVE_LOG": {
      const log = action.payload;

      // Find or append log
      const idx = state.logs.findIndex((l) => l.sessionId === log.sessionId);
      const updatedLogs =
        idx >= 0
          ? [...state.logs.slice(0, idx), log, ...state.logs.slice(idx + 1)]
          : [...state.logs, log];

      // Persist both to localStorage atomically
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
          localStorage.setItem(ACTIVE_SESSION_KEY, log.sessionId);
        } catch (err) {
          console.error(`[LogsContext] localStorage error:`, err);
        }
      }

      return {
        logs: updatedLogs,
        activeSessionId: log.sessionId,
      };
    }

    case "HYDRATE_FROM_STORAGE": {
      return {
        logs: action.payload.logs,
        activeSessionId: action.payload.activeSessionId,
      };
    }

    case "REMOVE_LOG": {
      const sessionId = action.payload;
      const updatedLogs = state.logs.filter((l) => l.sessionId !== sessionId);

      // If the removed log was active, fall back to last remaining log
      let newActiveSessionId = state.activeSessionId;
      if (state.activeSessionId === sessionId) {
        newActiveSessionId =
          updatedLogs.length > 0
            ? updatedLogs[updatedLogs.length - 1].sessionId
            : null;
      }

      if (typeof window !== "undefined") {
        try {
          if (updatedLogs.length === 0) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(ACTIVE_SESSION_KEY);
          } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
            if (newActiveSessionId) {
              localStorage.setItem(ACTIVE_SESSION_KEY, newActiveSessionId);
            } else {
              localStorage.removeItem(ACTIVE_SESSION_KEY);
            }
          }
        } catch (err) {
          console.error(`[LogsContext] localStorage error:`, err);
        }
      }

      return {
        logs: updatedLogs,
        activeSessionId: newActiveSessionId,
      };
    }

    case "CLEAR_LOGS": {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(ACTIVE_SESSION_KEY);
        } catch {
          // Ignore storage errors
        }
      }
      return { logs: [], activeSessionId: null };
    }

    default:
      return state;
  }
}

const LogsContext = createContext<LogsContextValue | null>(null);

export function LogsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(logsReducer, {
    logs: [],
    activeSessionId: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ParsedLog[] = JSON.parse(raw);
        // Re-hydrate Date objects
        const hydrated = parsed.map((log) => ({
          ...log,
          parsedAt: new Date(log.parsedAt),
          sessionStart: log.sessionStart
            ? new Date(log.sessionStart)
            : undefined,
          sessionEnd: log.sessionEnd ? new Date(log.sessionEnd) : undefined,
          entries: log.entries.map((e) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          })),
        }));

        const storedSessionId = localStorage.getItem(ACTIVE_SESSION_KEY);
        dispatch({
          type: "HYDRATE_FROM_STORAGE",
          payload: { logs: hydrated, activeSessionId: storedSessionId },
        });
      }
    } catch {
      // Ignore corrupt storage
    }
  }, []);

  // Compute activeLog from state
  const activeLog: ParsedLog | null = useMemo(() => {
    return (
      state.logs.find((l) => l.sessionId === state.activeSessionId) ??
      state.logs[state.logs.length - 1] ??
      null
    );
  }, [state.logs, state.activeSessionId]);

  const setActiveLog = useCallback((log: ParsedLog) => {
    dispatch({ type: "SET_ACTIVE_LOG", payload: log });
  }, []);

  const removeLog = useCallback((sessionId: string) => {
    dispatch({ type: "REMOVE_LOG", payload: sessionId });
  }, []);

  const clearLogs = useCallback(() => {
    dispatch({ type: "CLEAR_LOGS" });
  }, []);

  const value: LogsContextValue = useMemo(
    () => ({ logs: state.logs, activeLog, setActiveLog, removeLog, clearLogs }),
    [state.logs, activeLog, setActiveLog, removeLog, clearLogs]
  );

  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>;
}

export function useLogsContext(): LogsContextValue {
  const ctx = useContext(LogsContext);
  if (!ctx) {
    throw new Error("useLogsContext must be used within a LogsProvider");
  }
  return ctx;
}
