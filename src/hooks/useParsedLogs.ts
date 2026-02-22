"use client";

import { useReducer, useEffect, useCallback, useMemo } from "react";
import type { ParsedLog } from "@/lib/types";

const STORAGE_KEY = "eve-parsed-logs";
const ACTIVE_SESSION_KEY = "eve-active-session";

interface UseParsedLogsResult {
  logs: ParsedLog[];
  activeLog: ParsedLog | null;
  setActiveLog: (log: ParsedLog) => void;
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
  | { type: "CLEAR_LOGS" };

function logsReducer(state: LogsState, action: LogsAction): LogsState {
  switch (action.type) {
    case "SET_ACTIVE_LOG": {
      const log = action.payload;
      console.log(
        `[useParsedLogs] Reducer: SET_ACTIVE_LOG called with: ${log.fileName} (${log.sessionId})`,
      );

      // Find or append log
      const idx = state.logs.findIndex((l) => l.sessionId === log.sessionId);
      const updatedLogs =
        idx >= 0
          ? [...state.logs.slice(0, idx), log, ...state.logs.slice(idx + 1)]
          : [...state.logs, log];

      console.log(
        `[useParsedLogs] Reducer: Updated logs array, now have ${updatedLogs.length} logs`,
        updatedLogs.map((l) => l.fileName),
      );

      // Persist both to localStorage atomically
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
          localStorage.setItem(ACTIVE_SESSION_KEY, log.sessionId);
          console.log(`[useParsedLogs] Reducer: Persisted to localStorage`);
        } catch (err) {
          console.error(`[useParsedLogs] localStorage error:`, err);
        }
      }

      return {
        logs: updatedLogs,
        activeSessionId: log.sessionId,
      };
    }

    case "HYDRATE_FROM_STORAGE": {
      console.log(
        `[useParsedLogs] Reducer: HYDRATE_FROM_STORAGE with ${action.payload.logs.length} logs`,
      );
      return {
        logs: action.payload.logs,
        activeSessionId: action.payload.activeSessionId,
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

export function useParsedLogs(): UseParsedLogsResult {
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
    console.log(
      `[useParsedLogs] useMemo computing activeLog. logs count: ${state.logs.length}, activeSessionId: ${state.activeSessionId}`,
    );
    const result =
      state.logs.find((l) => l.sessionId === state.activeSessionId) ??
      state.logs[state.logs.length - 1] ??
      null;
    console.log(
      `[useParsedLogs] activeLog computed:`,
      result?.fileName ?? "null",
    );
    return result;
  }, [state.logs, state.activeSessionId]);

  const setActiveLog = useCallback((log: ParsedLog) => {
    console.log(
      `[useParsedLogs] setActiveLog called with: ${log.fileName} (${log.sessionId})`,
    );
    dispatch({ type: "SET_ACTIVE_LOG", payload: log });
  }, []);

  const clearLogs = useCallback(() => {
    dispatch({ type: "CLEAR_LOGS" });
  }, []);

  return { logs: state.logs, activeLog, setActiveLog, clearLogs };
}

export default useParsedLogs;
