"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type { LogEntry, EventType } from "@/lib/types";
import type { ActiveToggles } from "./CombinedChart";

export interface RawLogPanelProps {
  entries: LogEntry[];
  brushWindow: { start: Date; end: Date } | null;
  activeToggles: ActiveToggles;
}

const TOGGLE_EVENT_TYPES: Record<keyof ActiveToggles, EventType[]> = {
  damageOut: ["damage-dealt", "miss-outgoing"],
  damageIn: ["damage-received", "miss-incoming"],
  capPressure: ["neut-received", "neut-dealt", "nos-dealt"],
  reps: ["rep-received", "rep-outgoing"],
  tracking: [], // chart-only overlay — no raw log entries to filter
};

const EVENT_TYPE_COLOR: Partial<Record<EventType, string>> = {
  "damage-dealt": "#00d4ff",
  "miss-outgoing": "#00d4ff",
  "damage-received": "#e53e3e",
  "miss-incoming": "#e53e3e",
  "neut-received": "#e58c00",
  "neut-dealt": "#e58c00",
  "nos-dealt": "#e58c00",
  "rep-received": "#66cc66",
  "rep-outgoing": "#66cc66",
};

function stripTags(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatEveTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `[ ${yyyy}.${mm}.${dd} ${hh}:${min}:${ss} ]`;
}

export default function RawLogPanel({
  entries,
  brushWindow,
  activeToggles,
}: RawLogPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const filteredEntries = useMemo(() => {
    const allowedTypes = new Set<EventType>();
    for (const [key, types] of Object.entries(TOGGLE_EVENT_TYPES)) {
      if (activeToggles[key as keyof ActiveToggles]) {
        types.forEach((t) => allowedTypes.add(t));
      }
    }

    const filtered = entries.filter((entry) => {
      if (!allowedTypes.has(entry.eventType)) return false;
      if (brushWindow !== null) {
        return (
          entry.timestamp >= brushWindow.start &&
          entry.timestamp <= brushWindow.end
        );
      }
      return true;
    });

    filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    if (filtered.length > 2000) return filtered.slice(-2000);
    return filtered;
  }, [entries, brushWindow, activeToggles]);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    // Keep log panel anchored to top without moving the page viewport.
    scrollContainerRef.current.scrollTop = 0;
  }, [filteredEntries]);

  return (
    <div
      className="flex flex-col h-full bg-space border border-border border-t-2 border-t-cyan-dim rounded-sm shadow-lg"
      style={{
        clipPath:
          "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-dim shrink-0">
        <span className="text-text-secondary text-sm tracking-widest font-ui font-semibold uppercase">
          Combat Log
        </span>
        <span className="font-mono text-xs text-[#555]">
          {filteredEntries.length} entries
        </span>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed"
      >
        {filteredEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#555]">
            No entries in selection
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const color = EVENT_TYPE_COLOR[entry.eventType] ?? "#666";
            const stripped = stripTags(entry.rawLine);
            const ts = formatEveTimestamp(entry.timestamp);
            return (
              <div
                key={entry.id}
                className="px-3 py-[3px] border-l-2 hover:bg-[#111] transition-colors"
                style={{ borderLeftColor: color }}
              >
                <span className="text-[#555]">{ts} </span>
                <span style={{ color }}>{stripped}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
