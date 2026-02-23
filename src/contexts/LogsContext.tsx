"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ParsedLog } from "@/lib/types";

const STORAGE_KEY = "eve-parsed-logs";
const ACTIVE_SESSION_KEY = "eve-active-session";
const USER_ID_KEY = "eve-user-id";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface LogsContextValue {
  logs: ParsedLog[];
  activeLog: ParsedLog | null;
  currentLogId?: string; // Track selected log ID for authenticated users
  userId: string | null;
  needsRecovery: boolean;
  setActiveLog: (log: ParsedLog) => void;
  selectLog: (id: string) => Promise<void>; // Load a specific log by ID
  deleteLog: (id: string) => Promise<void>; // Delete a specific log by ID
  removeLog: (sessionId: string) => void; // Legacy: remove by sessionId
  clearLogs: () => void;
  loadUserLogs: () => Promise<void>; // Fetch and load user's logs from API
  uploadLog: (filename: string, log: ParsedLog) => Promise<string>; // Upload log, returns log ID
  restoreFromUserId: (uuid: string) => Promise<number>;
}

interface LogsState {
  logs: ParsedLog[];
  activeSessionId: string | null;
  currentLogId?: string; // Track selected log ID for authenticated users
}

type LogsAction =
  | { type: "SET_ACTIVE_LOG"; payload: ParsedLog }
  | {
      type: "HYDRATE_FROM_STORAGE";
      payload: { logs: ParsedLog[]; activeSessionId: string | null };
    }
  | { type: "REMOVE_LOG"; payload: string }
  | { type: "CLEAR_LOGS" }
  | { type: "SELECT_LOG"; payload: string } // Select a log by ID
  | { type: "DELETE_LOG"; payload: string } // Delete a log by ID
  | { type: "ADD_LOG"; payload: ParsedLog } // Add a log without setting as active
  | { type: "REPLACE_LOGS"; payload: ParsedLog[] }; // Replace entire logs list

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

    case "SELECT_LOG": {
      // Select a log by ID (for authenticated users)
      const logId = action.payload;
      const log = state.logs.find((l) => l.sessionId === logId);
      if (!log) return state;

      return {
        logs: state.logs,
        activeSessionId: state.activeSessionId,
        currentLogId: logId,
      };
    }

    case "DELETE_LOG": {
      // Delete a log by ID (removes from local state)
      const logId = action.payload;
      const updatedLogs = state.logs.filter((l) => l.sessionId !== logId);

      // If deleted log was active, switch to another
      let newActiveSessionId = state.activeSessionId;
      if (state.activeSessionId === logId) {
        newActiveSessionId =
          updatedLogs.length > 0
            ? updatedLogs[updatedLogs.length - 1].sessionId
            : null;
      }

      return {
        logs: updatedLogs,
        activeSessionId: newActiveSessionId,
      };
    }

    case "ADD_LOG": {
      // Add a log without changing the active log
      const log = action.payload;
      const idx = state.logs.findIndex((l) => l.sessionId === log.sessionId);
      const updatedLogs =
        idx >= 0
          ? [...state.logs.slice(0, idx), log, ...state.logs.slice(idx + 1)]
          : [...state.logs, log];

      return {
        logs: updatedLogs,
        activeSessionId: state.activeSessionId,
        currentLogId: state.currentLogId,
      };
    }

    case "REPLACE_LOGS": {
      // Replace entire logs list (useful for loading authenticated user logs)
      const logs = action.payload;
      const newActiveSessionId =
        logs.length > 0 ? logs[logs.length - 1].sessionId : null;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
          if (newActiveSessionId) {
            localStorage.setItem(ACTIVE_SESSION_KEY, newActiveSessionId);
          } else {
            localStorage.removeItem(ACTIVE_SESSION_KEY);
          }
        } catch (err) {
          console.error(`[LogsContext] localStorage error:`, err);
        }
      }

      return {
        logs,
        activeSessionId: newActiveSessionId,
      };
    }

    default:
      return state;
  }
}

/** Re-hydrate Date objects after JSON deserialization */
function hydrateLog(log: ParsedLog): ParsedLog {
  return {
    ...log,
    parsedAt: new Date(log.parsedAt as unknown as string),
    sessionStart: log.sessionStart
      ? new Date(log.sessionStart as unknown as string)
      : undefined,
    sessionEnd: log.sessionEnd
      ? new Date(log.sessionEnd as unknown as string)
      : undefined,
    entries: log.entries.map((e) => ({
      ...e,
      timestamp: new Date(e.timestamp as unknown as string),
    })),
  };
}

const LogsContext = createContext<LogsContextValue | null>(null);

export function LogsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(logsReducer, {
    logs: [],
    activeSessionId: null,
  });

  const userIdRef = useRef<string | null>(null);
  const autoRestoredRef = useRef(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [needsRecovery, setNeedsRecovery] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Guard against React 18 strict-mode double-invocation in dev
    if (autoRestoredRef.current) return;
    autoRestoredRef.current = true;

    const storedUserId = localStorage.getItem(USER_ID_KEY);
    const parsedLogsRaw = localStorage.getItem(STORAGE_KEY);

    if (!storedUserId && !parsedLogsRaw) {
      // Both keys absent: full cache wipe. Generate a fresh userId and ask the
      // user to supply their old one via the recovery banner.
      const newUserId = generateUUID();
      localStorage.setItem(USER_ID_KEY, newUserId);
      userIdRef.current = newUserId;
      setUserId(newUserId);
      setNeedsRecovery(true);
      return;
    }

    // Resolve or generate userId
    let resolvedUserId = storedUserId;
    if (!resolvedUserId) {
      resolvedUserId = generateUUID();
      localStorage.setItem(USER_ID_KEY, resolvedUserId);
    }
    userIdRef.current = resolvedUserId;
    setUserId(resolvedUserId);

    if (parsedLogsRaw) {
      // Normal hydration from localStorage
      try {
        const parsed: ParsedLog[] = JSON.parse(parsedLogsRaw);
        const hydrated = parsed.map(hydrateLog);
        const storedSessionId = localStorage.getItem(ACTIVE_SESSION_KEY);
        dispatch({
          type: "HYDRATE_FROM_STORAGE",
          payload: { logs: hydrated, activeSessionId: storedSessionId },
        });
      } catch {
        // Ignore corrupt storage
      }
    } else {
      // Auto-restore: userId present but no local logs (quota eviction).
      // Silently re-fetch all user logs from the server in the background.
      void (async () => {
        try {
          const res = await fetch(`/api/user-logs?userId=${resolvedUserId}`);
          if (!res.ok) return;
          const { logs: metas } = (await res.json()) as {
            logs: Array<{ sessionId: string }>;
          };
          if (!metas || metas.length === 0) return;

          for (const meta of metas) {
            try {
              const logRes = await fetch(
                `/api/user-logs/${meta.sessionId}?userId=${resolvedUserId}`,
              );
              if (!logRes.ok) continue;
              const { log } = (await logRes.json()) as { log: ParsedLog };
              dispatch({ type: "SET_ACTIVE_LOG", payload: hydrateLog(log) });
            } catch {
              // Skip individual failed fetches
            }
          }
        } catch {
          // Ignore network errors during silent restore
        }
      })();
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

    // Fire-and-forget: persist full log to server for recovery
    const uid = userIdRef.current;
    if (uid) {
      fetch("/api/user-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, log }),
      }).catch(() => {});
    }
  }, []);

  const removeLog = useCallback((sessionId: string) => {
    dispatch({ type: "REMOVE_LOG", payload: sessionId });
  }, []);

  const clearLogs = useCallback(() => {
    dispatch({ type: "CLEAR_LOGS" });
  }, []);

  /**
   * Select a specific log by ID (for authenticated users)
   */
  const selectLog = useCallback(
    async (logId: string): Promise<void> => {
      try {
        const res = await fetch(`/api/logs/${logId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch log: ${res.statusText}`);
        }
        const { log } = (await res.json()) as { log: ParsedLog };
        // Update the log if it already exists, or add it
        const idx = state.logs.findIndex((l) => l.sessionId === log.sessionId);
        if (idx >= 0) {
          dispatch({ type: "SET_ACTIVE_LOG", payload: hydrateLog(log) });
        } else {
          dispatch({ type: "ADD_LOG", payload: hydrateLog(log) });
        }
        // Set as current log
        dispatch({ type: "SELECT_LOG", payload: logId });
      } catch (error) {
        console.error("[LogsContext] selectLog error:", error);
        throw error;
      }
    },
    [state.logs],
  );

  /**
   * Delete a specific log by ID
   */
  const deleteLog = useCallback(async (logId: string): Promise<void> => {
    try {
      const res = await fetch(`/api/logs/${logId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(`Failed to delete log: ${res.statusText}`);
      }
      // Remove from local state
      dispatch({ type: "DELETE_LOG", payload: logId });
    } catch (error) {
      console.error("[LogsContext] deleteLog error:", error);
      throw error;
    }
  }, []);

  /**
   * Load all user logs from the server (for authenticated users)
   */
  const loadUserLogs = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/logs");
      if (!res.ok) {
        throw new Error(`Failed to fetch logs: ${res.statusText}`);
      }
      const { logs } = (await res.json()) as { logs: ParsedLog[] };
      const hydrated = logs.map(hydrateLog);
      dispatch({ type: "REPLACE_LOGS", payload: hydrated });
    } catch (error) {
      console.error("[LogsContext] loadUserLogs error:", error);
      throw error;
    }
  }, []);

  /**
   * Upload a log (authenticated or anonymous)
   * Returns the log ID
   */
  const uploadLog = useCallback(
    async (filename: string, log: ParsedLog): Promise<string> => {
      try {
        const res = await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ log, filename }),
        });
        if (!res.ok) {
          throw new Error(`Failed to upload log: ${res.statusText}`);
        }
        const { id } = (await res.json()) as { id: string; sessionId: string };
        // Update local state
        dispatch({ type: "SET_ACTIVE_LOG", payload: log });
        return id;
      } catch (error) {
        console.error("[LogsContext] uploadLog error:", error);
        throw error;
      }
    },
    [],
  );

  /**
   * Restore session from a user-supplied UUID (recovery banner flow).
   * Returns the number of logs successfully restored.
   */
  const restoreFromUserId = useCallback(
    async (uuid: string): Promise<number> => {
      localStorage.setItem(USER_ID_KEY, uuid);
      userIdRef.current = uuid;
      setUserId(uuid);

      const res = await fetch(`/api/user-logs?userId=${uuid}`);
      if (!res.ok) return 0;

      const { logs: metas } = (await res.json()) as {
        logs: Array<{ sessionId: string }>;
      };
      if (!metas || metas.length === 0) return 0;

      let count = 0;
      for (const meta of metas) {
        try {
          const logRes = await fetch(
            `/api/user-logs/${meta.sessionId}?userId=${uuid}`,
          );
          if (!logRes.ok) continue;
          const { log } = (await logRes.json()) as { log: ParsedLog };
          dispatch({ type: "SET_ACTIVE_LOG", payload: hydrateLog(log) });
          count++;
        } catch {
          // Skip individual failed fetches
        }
      }

      setNeedsRecovery(false);
      return count;
    },
    [],
  );

  const value: LogsContextValue = useMemo(
    () => ({
      logs: state.logs,
      activeLog,
      currentLogId: state.currentLogId,
      userId,
      needsRecovery: needsRecovery && state.logs.length === 0,
      setActiveLog,
      selectLog,
      deleteLog,
      removeLog,
      clearLogs,
      loadUserLogs,
      uploadLog,
      restoreFromUserId,
    }),
    [
      state.logs,
      state.currentLogId,
      activeLog,
      userId,
      needsRecovery,
      setActiveLog,
      selectLog,
      deleteLog,
      removeLog,
      clearLogs,
      loadUserLogs,
      uploadLog,
      restoreFromUserId,
    ],
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
