'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ParsedLog } from '@/lib/types';

const STORAGE_KEY = 'eve-parsed-logs';

interface UseParsedLogsResult {
  logs: ParsedLog[];
  activeLogs: ParsedLog[];
  setActiveLogs: (logs: ParsedLog[]) => void;
  clearLogs: () => void;
}

export function useParsedLogs(): UseParsedLogsResult {
  const [logs, setLogs] = useState<ParsedLog[]>([]);
  const [activeLogs, setActiveLogsState] = useState<ParsedLog[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ParsedLog[] = JSON.parse(raw);
        // Re-hydrate Date objects
        const hydrated = parsed.map((log) => ({
          ...log,
          parsedAt: new Date(log.parsedAt),
          sessionStart: log.sessionStart ? new Date(log.sessionStart) : undefined,
          sessionEnd: log.sessionEnd ? new Date(log.sessionEnd) : undefined,
          entries: log.entries.map((e) => ({ ...e, timestamp: new Date(e.timestamp) })),
        }));
        setLogs(hydrated);
        setActiveLogsState(hydrated);
      }
    } catch {
      // Ignore corrupt storage
    }
  }, []);

  const setActiveLogs = useCallback((updated: ParsedLog[]) => {
    setActiveLogsState(updated);
  }, []);

  const clearLogs = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    setLogs([]);
    setActiveLogsState([]);
  }, []);

  return { logs, activeLogs, setActiveLogs, clearLogs };
}

export default useParsedLogs;
