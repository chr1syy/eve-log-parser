"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  TimeSeriesDpsPoint,
  FightSegment,
  AttackerTimeSeries,
} from "@/lib/analysis/damageTaken";
import type { RepTimeSeriesPoint } from "@/lib/analysis/repAnalysis";

interface DpsTakenChartProps {
  timeSeries: TimeSeriesDpsPoint[];
  fights: FightSegment[];
  attackerSeries?: AttackerTimeSeries[];
  repTimeSeries?: RepTimeSeriesPoint[];
  zoomedWindow?: { start: Date; end: Date };
  onRangeSelect?: (start: Date, end: Date) => void;
  resetKey?: number;
}

type TimeValue = Date | string | number;

function toDate(value: TimeValue): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatTime(value: TimeValue): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

interface TooltipPayload {
  dataKey: string;
  payload: TimeSeriesDpsPoint | RepTimeSeriesPoint;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;

  // Find the DPS point (from the first line)
  const dpsPoint = payload.find((p: TooltipPayload) => p.dataKey === "dps")
    ?.payload as TimeSeriesDpsPoint | undefined;
  const repPoint = payload.find(
    (p: TooltipPayload) => p.dataKey === "repsPerSecond",
  )?.payload as RepTimeSeriesPoint | undefined;

  const point = dpsPoint ?? repPoint;
  if (!point) return null;

  return (
    <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur">
      <p className="text-text-secondary mb-1">{formatTime(point.timestamp)}</p>
      {dpsPoint && (
        <p className="text-status-kill font-bold">
          DPS IN:{" "}
          {dpsPoint.dps.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        </p>
      )}
      {repPoint && (
        <p className="text-text-success font-bold">
          REPS IN:{" "}
          {repPoint.repsPerSecond.toLocaleString(undefined, {
            maximumFractionDigits: 1,
          })}
        </p>
      )}
      {dpsPoint && (
        <p className="text-text-muted">Fight {dpsPoint.fightIndex + 1}</p>
      )}
    </div>
  );
}

export default function DpsTakenChart({
  timeSeries,
  fights,
  attackerSeries,
  repTimeSeries,
  zoomedWindow,
  onRangeSelect,
  resetKey,
}: DpsTakenChartProps) {
  // Ensure hooks run consistently even when there is no data. We render a
  // placeholder later if the series is empty.

  // Compute fight boundaries for reference lines
  const fightBoundaries: { timestamp: number; label: string }[] = [];
  for (let i = 1; i < fights.length; i++) {
    fightBoundaries.push({
      timestamp: fights[i].start.getTime(),
      label: `Fight ${i + 1}`,
    });
  }

  // Convert time series data for Recharts (keep full data so Brush indices
  // map consistently to timestamps when we render the Brush over the whole
  // dataset). Build baseData first then produce a final `data` array that
  // merges rep values without mutating objects (they may be frozen).
  const baseData = useMemo(
    () =>
      timeSeries.map((point) => ({
        ...point,
        timestampMs: toDate(point.timestamp).getTime(),
        timeLabel: formatTime(point.timestamp),
      })),
    [timeSeries],
  );

  const data = useMemo(() => {
    if (!repTimeSeries || repTimeSeries.length === 0) return baseData;

    const dpsMap = new Map<
      number,
      { dps: number; fightIndex: number; timestamp: Date; timeLabel: string }
    >();
    for (const pt of baseData) {
      dpsMap.set(pt.timestampMs, {
        dps: pt.dps,
        fightIndex: pt.fightIndex,
        timestamp: pt.timestamp,
        timeLabel: pt.timeLabel,
      });
    }

    const repMap = new Map<number, number>();
    for (const r of repTimeSeries) {
      repMap.set(r.timestamp.getTime(), r.repsPerSecond);
    }

    const allTs = Array.from(
      new Set<number>([...dpsMap.keys(), ...repMap.keys()]),
    ).sort((a, b) => a - b);

    const merged: Array<{
      timestampMs: number;
      timestamp: Date;
      timeLabel: string;
      dps: number;
      fightIndex: number;
      repsPerSecond?: number;
      [key: string]: unknown;
    }> = [];
    let lastDps = 0;
    let lastFightIndex = 0;
    let lastRps: number | undefined = undefined;
    for (const ts of allTs) {
      const d = dpsMap.get(ts);
      if (d) {
        lastDps = d.dps;
        lastFightIndex = d.fightIndex;
      }
      if (repMap.has(ts)) {
        lastRps = repMap.get(ts);
      }
      // Carry-forward last known repsPerSecond so the line remains
      // continuous between actual rep samples. Explicit zero points (which
      // are present in repMap) will set lastRps to 0 and produce a drop.
      merged.push({
        timestampMs: ts,
        timestamp: new Date(ts),
        timeLabel: formatTime(new Date(ts)),
        dps: d ? d.dps : lastDps,
        fightIndex: d ? d.fightIndex : lastFightIndex,
        repsPerSecond: lastRps,
      });
    }

    // Attach per-attacker DPS values (if supplied) using stable keys.
    if (attackerSeries && attackerSeries.length > 0) {
      for (let ai = 0; ai < attackerSeries.length; ai++) {
        const key = `att_${ai}`;
        const series = attackerSeries[ai];
        for (let i = 0; i < merged.length; i++) {
          // series.timeSeries should align to global timestamps; fall back to 0
          merged[i][key] = series.timeSeries?.[i]?.dps ?? 0;
        }
      }
    }

    // attach repsPerSecond as a visible key as well (may be undefined)
    // the existing repsPerSecond key is already used; visibility is controlled
    // via `repsVisible` state in the rendering.

    return merged;
  }, [baseData, repTimeSeries, attackerSeries]);

  // Brush + selection logic (mirrors DamageDealtChart pattern):
  const notifyTimer = useRef<number | null>(null);
  const lastZoomSourceRef = useRef<string | null>(null);
  const [syncIndices, setSyncIndices] = useState<
    { startIndex?: number; endIndex?: number } | undefined
  >(undefined);
  const [brushRemountKey, setBrushRemountKey] = useState<string | undefined>(
    undefined,
  );
  // Visibility state for per-attacker lines (legend toggles)
  const [attackerVisibility, setAttackerVisibility] = useState<
    Record<string, boolean>
  >({});

  // (Re)initialize visibility when attackerSeries changes
  useEffect(() => {
    if (!attackerSeries) return;
    const vis: Record<string, boolean> = {};
    attackerSeries.forEach((_a, i) => {
      vis[`att_${i}`] = true;
    });
    // Initialize visibility state from attackerSeries. This is intentionally
    // setting state during an effect in response to prop changes; disable
    // the linter warning because the initialization is derived from the
    // incoming prop and runs synchronously on mount/update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAttackerVisibility(vis);
  }, [attackerSeries]);

  // Reps visibility
  const [repsVisible, setRepsVisible] = useState<boolean>(true);

  const fullDomainMin = data[0]?.timestampMs ?? 0;
  const fullDomainMax = data[data.length - 1]?.timestampMs ?? 0;

  const domainMin = zoomedWindow ? zoomedWindow.start.getTime() : fullDomainMin;
  const domainMax = zoomedWindow ? zoomedWindow.end.getTime() : fullDomainMax;

  const brushIndexRange = (() => {
    if (!zoomedWindow) return undefined;
    const startMs = zoomedWindow.start.getTime();
    const endMs = zoomedWindow.end.getTime();
    let startIndex: number | undefined = undefined;
    let endIndex: number | undefined = undefined;
    for (let i = 0; i < data.length; i++) {
      const ts = data[i].timestampMs;
      if (startIndex === undefined && ts >= startMs) startIndex = i;
      if (ts <= endMs) endIndex = i;
      if (startIndex !== undefined && ts > endMs) break;
    }
    if (startIndex === undefined) startIndex = 0;
    if (endIndex === undefined) endIndex = data.length - 1;
    return { startIndex, endIndex };
  })();

  const handleBrushChange = (range?: {
    startIndex?: number;
    endIndex?: number;
  }) => {
    if (!onRangeSelect) return;
    if (!range) return;

    if (notifyTimer.current) {
      window.clearTimeout(notifyTimer.current);
      notifyTimer.current = null;
    }

    notifyTimer.current = window.setTimeout(() => {
      const si = range.startIndex ?? 0;
      const ei = range.endIndex ?? Math.max(0, data.length - 1);
      const start = data[Math.max(0, Math.min(si, data.length - 1))]?.timestamp;
      const end = data[Math.max(0, Math.min(ei, data.length - 1))]?.timestamp;
      if (start && end) {
        lastZoomSourceRef.current = "brush";
        onRangeSelect(start, end);
      }
      notifyTimer.current = null;
    }, 300);
  };

  useEffect(() => {
    if (!brushIndexRange) return;
    // transiently set sync indices to snap the Brush travellers — intentional
    // behavior, suppress the lint warning for clarity.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncIndices(brushIndexRange);
    setBrushRemountKey(
      `${brushIndexRange.startIndex ?? 0}-${brushIndexRange.endIndex ?? 0}-${Date.now()}`,
    );
    const id = window.setTimeout(() => setSyncIndices(undefined), 600);
    return () => window.clearTimeout(id);
  }, [brushIndexRange?.startIndex, brushIndexRange?.endIndex]);

  // Ensure brush SVG elements get the desired red inline styles. Some Recharts
  // builds render shapes with inline styles or other higher-specificity rules
  // that can defeat stylesheet selectors; apply inline styles and observe
  // mutations to keep them enforced across re-renders (matches
  // DamageDealtChart approach).
  useEffect(() => {
    const applyInlineStyles = () => {
      const root = document.querySelector(".damage-brush");
      if (!root) return;
      const slides = root.querySelectorAll<SVGElement>(
        ".recharts-brush-slide-rect, .recharts-brush-slide",
      );
      slides.forEach((el) => {
        try {
          el.style.fill = "#e53e3e";
          el.style.fillOpacity = "0.36";
        } catch (e) {
          // ignore
        }
      });

      const travellers = root.querySelectorAll<SVGElement>(
        ".recharts-brush-traveller, .recharts-brush-traveller-rect",
      );
      travellers.forEach((el) => {
        try {
          el.style.fill = "#e53e3e";
          el.style.stroke = "rgba(2,6,23,0.8)";
        } catch (e) {
          // ignore
        }
      });
    };

    applyInlineStyles();
    const root = document.querySelector(".damage-brush");
    if (!root) return;
    const mo = new MutationObserver(applyInlineStyles);
    mo.observe(root, { childList: true, subtree: true, attributes: true });
    return () => mo.disconnect();
  }, [brushRemountKey, data.length]);

  useEffect(() => {
    // When zoom is cleared (zoomedWindow becomes undefined) we force a
    // transient remount of the Brush set to the full range so the traveller
    // visually resets to the full domain. Skip this if the last zoom source
    // was the brush itself to avoid fighting user interaction — unless the
    // parent explicitly requested a reset via `resetKey`, in which case we
    // should honour the reset.
    if (zoomedWindow) return;
    if (lastZoomSourceRef.current === "brush" && resetKey === undefined) {
      lastZoomSourceRef.current = null;
      return;
    }

    const lastIdx = Math.max(0, data.length - 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncIndices({ startIndex: 0, endIndex: lastIdx });
    setBrushRemountKey(`clear-${Date.now()}`);
    const id = window.setTimeout(() => setSyncIndices(undefined), 600);
    return () => window.clearTimeout(id);
  }, [zoomedWindow, data.length, resetKey]);

  useEffect(() => {
    if (resetKey === undefined) return;
    const lastIdx = Math.max(0, data.length - 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncIndices({ startIndex: 0, endIndex: lastIdx });
    setBrushRemountKey(`reset-${resetKey}-${Date.now()}`);
    const id = window.setTimeout(() => setSyncIndices(undefined), 600);
    return () => window.clearTimeout(id);
  }, [resetKey, data.length]);

  if (timeSeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted font-mono text-xs">
        NO INCOMING DAMAGE DATA
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="dpsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e53e3e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#e53e3e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1a254060"
            vertical={false}
          />
          <XAxis
            dataKey="timestampMs"
            type="number"
            domain={[domainMin, domainMax]}
            tick={{
              fill: "#8892a4",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
            axisLine={{ stroke: "#1a2540" }}
            tickLine={false}
            tickFormatter={(ts: number) => formatTime(new Date(ts))}
          />
          <YAxis
            tick={{
              fill: "#8892a4",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="dps"
            stroke="none"
            fill="url(#dpsGradient)"
            dot={false}
            animationDuration={600}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="dps"
            stroke="#e53e3e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: "#e53e3e" }}
            animationDuration={600}
            animationEasing="ease-out"
          />
          {/* Per-attacker lines (non-NPC). Render above the DPS area so they are visible. */}
          {attackerSeries &&
            attackerSeries.map((att: AttackerTimeSeries, idx: number) => {
              const key = `att_${idx}`;
              if (!attackerVisibility[key]) return null;
              return (
                <Line
                  key={`att-${idx}`}
                  type="monotone"
                  dataKey={key}
                  stroke={att.color}
                  strokeWidth={2}
                  dot={false}
                  opacity={0.95}
                  isAnimationActive={false}
                />
              );
            })}
          {repTimeSeries && repTimeSeries.length > 0 && repsVisible && (
            <Line
              // Use a stepped line so gaps that drop to explicit zeros appear
              // as immediate drops rather than a smoothed decline.
              type="stepAfter"
              dataKey="repsPerSecond"
              stroke="#66cc66"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 3, fill: "#66cc66" }}
              animationDuration={600}
              animationEasing="ease-out"
            />
          )}
          {fightBoundaries
            .filter((b) => b.timestamp >= domainMin && b.timestamp <= domainMax)
            .map((boundary, idx) => (
              <ReferenceLine
                key={idx}
                x={boundary.timestamp}
                stroke="#8892a4"
                strokeDasharray="4 4"
                label={{
                  value: boundary.label,
                  position: "top",
                  fill: "#8892a4",
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              />
            ))}
          {onRangeSelect && (
            <>
              <Brush
                key={brushRemountKey}
                className="damage-brush"
                dataKey="timestampMs"
                height={20}
                travellerWidth={12}
                stroke="#005f99"
                startIndex={
                  syncIndices?.startIndex ?? brushIndexRange?.startIndex
                }
                endIndex={syncIndices?.endIndex ?? brushIndexRange?.endIndex}
                onChange={(r) => handleBrushChange(r)}
              />
              <style jsx global>{`
                .damage-brush .recharts-brush-slide {
                  fill: #e53e3e;
                }
                .damage-brush .recharts-brush-slide-rect,
                .damage-brush .recharts-brush-slide.selected,
                .damage-brush .recharts-brush-slide[fill-opacity="0.36"] {
                  fill: #e53e3e !important;
                  fill-opacity: 0.36 !important;
                }
                .damage-brush .recharts-brush-traveller,
                .damage-brush .recharts-brush-traveller-rect {
                  fill: #e53e3e !important;
                  stroke: rgba(2, 6, 23, 0.8) !important;
                }
              `}</style>
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Attacker color mapping below the chart */}
      {attackerSeries && attackerSeries.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {attackerSeries.map((att, i) => {
            const key = `att_${i}`;
            const visible = attackerVisibility[key] ?? true;
            return (
              <button
                key={`legend-${i}`}
                type="button"
                onClick={() =>
                  setAttackerVisibility((s) => ({ ...s, [key]: !visible }))
                }
                className="flex items-center gap-2 focus:outline-none"
                aria-pressed={!visible}
                title={`${att.source}${att.shipType ? ` — ${att.shipType}` : ""}`}
              >
                <span
                  className="w-4 h-4 inline-flex items-center justify-center rounded-sm text-[10px] font-mono text-black"
                  style={{ backgroundColor: att.color }}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span
                  className={`font-mono text-xs ${
                    visible ? "text-text-primary" : "text-text-muted"
                  }`}
                >
                  {att.source}
                  {att.shipType ? ` — ${att.shipType}` : ""}
                </span>
              </button>
            );
          })}
          {/* Reps legend entry (interactive) */}
          {repTimeSeries && repTimeSeries.length > 0 && (
            <button
              type="button"
              onClick={() => setRepsVisible((v) => !v)}
              className="flex items-center gap-2 focus:outline-none"
              aria-pressed={!repsVisible}
              title="Toggle incoming reps"
            >
              <span
                className="w-4 h-4 inline-flex items-center justify-center rounded-sm text-[10px] font-mono text-black"
                style={{ backgroundColor: "#66cc66" }}
                aria-hidden
              >
                R
              </span>
              <span
                className={`font-mono text-xs ${repsVisible ? "text-text-primary" : "text-text-muted"}`}
              >
                Incoming Reps
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
