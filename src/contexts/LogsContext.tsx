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
import { useSession } from "next-auth/react";
import type { ParsedLog } from "@/lib/types";

const STORAGE_KEY = "eve-parsed-logs";
const ACTIVE_SESSION_KEY = "eve-active-session";
const USER_ID_KEY = "eve-user-id";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function isAnonymousUserId(userId: string | null): boolean {
  if (!userId) return false;
  return UUID_RE.test(userId);
}

export interface LogsContextValue {
  logs: ParsedLog[];
  activeLog: ParsedLog | null;
  currentLogId?: string; // Track selected log ID for authenticated users
  userId: string | null;
  needsRecovery: boolean;
  setActiveLog: (
    log: ParsedLog,
    rawLogText?: string,
    rawFileName?: string,
  ) => void;
  selectLog: (id: string) => Promise<void>; // Load a specific log by ID
  deleteLog: (id: string) => Promise<void>; // Delete a specific log by ID
  removeLog: (sessionId: string) => void; // Legacy: remove by sessionId
  clearLogs: () => void;
  loadUserLogs: () => Promise<void>; // Fetch and load user's logs from API
  uploadLog: (filename: string, log: ParsedLog) => Promise<string>; // Upload log, returns log ID
  restoreFromUserId: (uuid: string) => Promise<number>;
  updateLogMetadata: (
    sessionId: string,
    updates: Partial<
      Pick<ParsedLog, "displayName" | "characterName" | "fileName">
    >,
  ) => void;
}

interface LogsState {
  logs: ParsedLog[];
  activeSessionId: string | null;
  currentLogId?: string; // Track selected log ID for authenticated users
}

type LogsAction =
  | { type: "SET_ACTIVE_LOG"; payload: ParsedLog }
  | {
      type: "UPDATE_LOG_META";
      payload: { sessionId: string; updates: Partial<ParsedLog> };
    }
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
        } catch {
          // Log storage failures
          console.error(`[LogsContext] localStorage error:`);
        }
      }

      return {
        logs: updatedLogs,
        activeSessionId: log.sessionId,
      };
    }

    case "UPDATE_LOG_META": {
      const { sessionId, updates } = action.payload;
      const updatedLogs = state.logs.map((l) =>
        l.sessionId === sessionId ? ({ ...l, ...updates } as ParsedLog) : l,
      );

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
        } catch {
          // ignore
        }
      }

      return { ...state, logs: updatedLogs };
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
    entries: (log.entries ?? []).map((e) => ({
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
  // Track which character ID we've already loaded server logs for
  const loadedForCharacterRef = useRef<string | null>(null);
  // Holds an anonymous userId pending server restore until auth status resolves
  const pendingAnonRestoreRef = useRef<string | null>(null);

  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated =
    sessionStatus === "authenticated" && !!session?.user;

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
    const computedNeedsRecovery = !storedUserId && !parsedLogsRaw;

    let resolvedUserId = storedUserId;
    if (!resolvedUserId) {
      resolvedUserId = generateUUID();
      localStorage.setItem(USER_ID_KEY, resolvedUserId);
    }

    userIdRef.current = resolvedUserId;
    setUserId(resolvedUserId);
    setNeedsRecovery(computedNeedsRecovery);

    if (computedNeedsRecovery) {
      return;
    }

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
      // Defer anonymous server restore until we know the auth status.
      // Avoids a 403 when the user is authenticated but localStorage still
      // holds an anonymous UUID from a previous logout cycle.
      pendingAnonRestoreRef.current = resolvedUserId;
    }
  }, []);

  // Anonymous server restore: fires once auth status is known.
  // Only proceeds when the user is unauthenticated — authenticated users are
  // handled by the EVE SSO effect below.
  useEffect(() => {
    if (sessionStatus === "loading") return;

    const pendingUserId = pendingAnonRestoreRef.current;
    pendingAnonRestoreRef.current = null;

    if (sessionStatus === "authenticated" || !pendingUserId) return;
    if (!isAnonymousUserId(pendingUserId)) return;

    void (async () => {
      try {
        const res = await fetch(`/api/user-logs?userId=${pendingUserId}`);
        if (!res.ok) return;
        const { logs: metas } = (await res.json()) as {
          logs: Array<{ sessionId: string }>;
        };
        if (!metas || metas.length === 0) return;

        const restored: ParsedLog[] = [];
        for (const meta of metas.slice(0, 1)) {
          try {
            const logRes = await fetch(
              `/api/user-logs/${meta.sessionId}?userId=${pendingUserId}`,
            );
            if (!logRes.ok) continue;
            const { log } = (await logRes.json()) as { log: ParsedLog };
            restored.push(hydrateLog(log));
          } catch {
            // Skip individual failed fetches
          }
        }

        if (restored.length > 0) {
          dispatch({ type: "REPLACE_LOGS", payload: restored });
        }
      } catch {
        // Ignore network errors during silent restore
      }
    })();
  }, [sessionStatus]);

  // When authenticated via EVE SSO, override userId with character ID and
  // load any server-persisted logs for that character (cross-device restore).
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    // user.id is set to String(character_id) by the profile() callback
    const characterId: string | null = user.id
      ? String(user.id)
      : user.character_id
        ? String(user.character_id)
        : null;

    if (!characterId) return;

    // Update userId to character ID so new uploads go to the right directory
    if (userIdRef.current !== characterId) {
      userIdRef.current = characterId;
      setUserId(characterId);
      setNeedsRecovery(false);
      try {
        localStorage.setItem(USER_ID_KEY, characterId);
      } catch {
        // ignore storage errors
      }
    }

    // Load server logs once per character ID per session
    if (loadedForCharacterRef.current === characterId) return;
    loadedForCharacterRef.current = characterId;

    void (async () => {
      try {
        const res = await fetch(`/api/user-logs?userId=${characterId}`);
        if (!res.ok) return;
        const { logs: metas } = (await res.json()) as {
          logs: Array<{ sessionId: string }>;
        };
        if (!metas || metas.length === 0) return;

        const restored: ParsedLog[] = [];
        for (const meta of metas) {
          try {
            const logRes = await fetch(
              `/api/user-logs/${meta.sessionId}?userId=${characterId}`,
            );
            if (!logRes.ok) continue;
            const { log } = (await logRes.json()) as { log: ParsedLog };
            restored.push(hydrateLog(log));
          } catch {
            // Skip individual failed fetches
          }
        }
        // Add all logs in one synchronous pass — React 18 batches these
        // dispatches into a single render, eliminating the per-log flicker.
        // ADD_LOG upserts without changing the active log; SET_ACTIVE_LOG
        // on the last entry sets the final active log once.
        for (let i = 0; i < restored.length; i++) {
          if (i < restored.length - 1) {
            dispatch({ type: "ADD_LOG", payload: restored[i] });
          } else {
            dispatch({ type: "SET_ACTIVE_LOG", payload: restored[i] });
          }
        }
      } catch {
        // Ignore network errors
      }
    })();
  }, [sessionStatus, session]);

  // When logging out, rotate to a fresh anonymous ID and clear local logs
  useEffect(() => {
    if (sessionStatus !== "unauthenticated") return;
    const current = userIdRef.current;
    if (!current || isAnonymousUserId(current)) return;

    const anonId = generateUUID();
    userIdRef.current = anonId;
    setUserId(anonId);
    setNeedsRecovery(false);
    try {
      localStorage.setItem(USER_ID_KEY, anonId);
    } catch {
      // ignore storage errors
    }
    dispatch({ type: "CLEAR_LOGS" });
  }, [sessionStatus]);

  // Compute activeLog from state
  const activeLog: ParsedLog | null = useMemo(() => {
    return (
      state.logs.find((l) => l.sessionId === state.activeSessionId) ??
      state.logs[state.logs.length - 1] ??
      null
    );
  }, [state.logs, state.activeSessionId]);

  const setActiveLog = useCallback(
    (log: ParsedLog, rawLogText?: string, rawFileName?: string) => {
      if (isAuthenticated) {
        dispatch({ type: "SET_ACTIVE_LOG", payload: log });
      } else {
        dispatch({ type: "REPLACE_LOGS", payload: [log] });
      }

      // Fire-and-forget: persist full log to server for recovery
      const uid = userIdRef.current;
      if (uid) {
        fetch("/api/user-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: uid,
            log,
            rawLogText,
            rawFileName,
            singleLog: !isAuthenticated,
          }),
        }).catch(() => {});
      }
    },
    [isAuthenticated],
  );

  const removeLog = useCallback((sessionId: string) => {
    dispatch({ type: "REMOVE_LOG", payload: sessionId });
  }, []);

  const clearLogs = useCallback(() => {
    dispatch({ type: "CLEAR_LOGS" });
  }, []);

  const updateLogMetadata = useCallback(
    (
      sessionId: string,
      updates: Partial<
        Pick<ParsedLog, "displayName" | "characterName" | "fileName">
      >,
    ) => {
      dispatch({ type: "UPDATE_LOG_META", payload: { sessionId, updates } });
    },
    [],
  );

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
      const metasToLoad = UUID_RE.test(uuid) ? metas.slice(0, 1) : metas;
      for (const meta of metasToLoad) {
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
      updateLogMetadata,
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
      updateLogMetadata,
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
