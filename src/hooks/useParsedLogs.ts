"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

  // Use useMemo to ensure activeLog is a stable reference and properly updates
  const activeLog: ParsedLog | null = useMemo(() => {
    return (
      logs.find((l) => l.sessionId === activeSessionId) ??
      logs[logs.length - 1] ??
      null
    );
  }, [logs, activeSessionId]);

  const setActiveLog = useCallback((log: ParsedLog) => {
    console.log(
      `[useParsedLogs] setActiveLog called with: ${log.fileName} (${log.sessionId})`,
    );

    // Update logs array: upsert log (update if exists by sessionId, otherwise append)
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.sessionId === log.sessionId);
      const updated =
        idx >= 0
          ? [...prev.slice(0, idx), log, ...prev.slice(idx + 1)]
          : [...prev, log];

      console.log(
        `[useParsedLogs] Updated logs array, now have ${updated.length} logs`,
      );

      // Persist to localStorage immediately
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          console.log(`[useParsedLogs] Persisted to localStorage`);
        } catch (err) {
          console.error(`[useParsedLogs] localStorage error:`, err);
        }
      }
      return updated;
    });

    // Update active session ID
    console.log(`[useParsedLogs] Setting activeSessionId to: ${log.sessionId}`);
    setActiveSessionId(log.sessionId);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ACTIVE_SESSION_KEY, log.sessionId);
      } catch (err) {
        console.error(
          `[useParsedLogs] localStorage ACTIVE_SESSION_KEY error:`,
          err,
        );
      }
    }
  }, []);

  const clearLogs = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      // Ignore storage errors
    }
    setLogs([]);
    setActiveSessionId(null);
  }, []);

  return { logs, activeLog, setActiveLog, clearLogs };
}

export default useParsedLogs;
