"use client";

import { useState, useEffect, useCallback } from "react";
import type { ParsedLog } from "@/lib/types";

const STORAGE_KEY = "eve-parsed-logs";
const ACTIVE_SESSION_KEY = "eve-active-session";

interface UseParsedLogsResult {
  logs: ParsedLog[];
  activeLog: ParsedLog | null;
  setActiveLog: (log: ParsedLog) => void;
  clearLogs: () => void;
}

export function useParsedLogs(): UseParsedLogsResult {
  const [logs, setLogs] = useState<ParsedLog[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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
        setLogs(hydrated);
      }
      const storedSessionId = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (storedSessionId) {
        setActiveSessionId(storedSessionId);
      }
    } catch {
      // Ignore corrupt storage
    }
  }, []);

  const activeLog: ParsedLog | null =
    logs.find((l) => l.sessionId === activeSessionId) ??
    logs[logs.length - 1] ??
    null;

  const setActiveLog = useCallback((log: ParsedLog) => {
    // Upsert log into logs array (update if exists by sessionId, otherwise append)
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.sessionId === log.sessionId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = log;
        return updated;
      }
      return [...prev, log];
    });
    setActiveSessionId(log.sessionId);
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_SESSION_KEY, log.sessionId);
    }
  }, []);

  const clearLogs = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    setLogs([]);
    setActiveSessionId(null);
  }, []);

  return { logs, activeLog, setActiveLog, clearLogs };
}

export default useParsedLogs;
