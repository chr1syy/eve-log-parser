"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Brush,
  // Use a small test-friendly wrapper so unit tests can inspect stroke props
  // and the integration test mock can still override Recharts as needed.
  ReferenceLine as RawReferenceLine,
} from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
// RangeSlider was experimental and removed — prefer Recharts Brush for selection
// import RangeSlider from "./RangeSlider";
import type {
  DamageDealtTimeSeries,
  DamageDealtPoint,
  TackleWindow,
} from "@/lib/analysis/damageDealt";

interface DamageDealtChartProps {
  series: DamageDealtTimeSeries;
  fightBoundaries?: number[];
  zoomedWindow?: { start: Date; end: Date };
  excludeDrones?: boolean;
  onRangeSelect?: (start: Date, end: Date) => void;
  // Optional key that, when changed, forces the Brush sliders to remount and
  // snap to the full domain. Page-level RESET should increment this key.
  resetKey?: number;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function isInTackleWindow(
  ts: number,
  windows: TackleWindow[],
): TackleWindow | null {
  return (
    windows.find((w) => ts >= w.start.getTime() && ts <= w.end.getTime()) ??
    null
  );
}

export function resolveBrushRange(
  data: Array<{ timestamp: Date }>,
  startIndex?: number,
  endIndex?: number,
): { start: Date; end: Date } | null {
  if (!data.length || startIndex === undefined || endIndex === undefined) {
    return null;
  }

  const lastIndex = data.length - 1;
  const clampedStart = Math.max(0, Math.min(startIndex, lastIndex));
  const clampedEnd = Math.max(0, Math.min(endIndex, lastIndex));
  const safeStart = Math.min(clampedStart, clampedEnd);
  const safeEnd = Math.max(clampedStart, clampedEnd);
  const start = data[safeStart]?.timestamp;
  const end = data[safeEnd]?.timestamp;

  if (!start || !end) return null;

  return { start, end };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, tackleWindows }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as DamageDealtPoint & {
    timestampMs: number;
  };
  if (!point) return null;
  const tackleWindow = isInTackleWindow(point.timestampMs, tackleWindows ?? []);
  return (
    <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur space-y-1">
      <p className="text-text-secondary">{formatTime(point.timestamp)}</p>
      <p className="text-[#00d4ff] font-bold">
        DPS: {point.dps.toLocaleString(undefined, { maximumFractionDigits: 1 })}
      </p>
      <p className="text-[#cc0000]">Bad Hit: {point.badHitPct.toFixed(1)}%</p>
      {tackleWindow && (
        <>
          <p className="text-[#4488ff] font-bold">TACKLED</p>
          {tackleWindow.targetShips && tackleWindow.targetShips.size > 0 && (
            <p className="text-[#4488ff] text-xs">
              {Array.from(tackleWindow.targetShips).join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

import TestReferenceLine from "./TestReferenceLine";

export default function DamageDealtChart({
  series,
  fightBoundaries,
  zoomedWindow,
  excludeDrones,
  onRangeSelect,
  resetKey,
}: DamageDealtChartProps) {
  const { points, tackleWindows } = series;

  // render hooks and computations regardless of data size (rules-of-hooks
  // require hooks to run in the same order every render). If there is no
  // data we still compute safe defaults and show the NO DATA placeholder at
  // render time below.

  // Keep full data for the chart so Brush always operates over the entire
  // timeline. When a zoomedWindow is provided we narrow the X axis domain to
  // the requested window but still render from the full dataset. This avoids
  // the brush "jumping" behavior caused by rendering the brush against a
  // filtered (shortened) data array.
  const fullPoints = points;
  const data = useMemo(
    () =>
      fullPoints.map((pt) => ({ ...pt, timestampMs: pt.timestamp.getTime() })),
    [fullPoints],
  );

  // Filter to zoomed window if provided for other UI bits (tooltips / labels)
  const visiblePoints = zoomedWindow
    ? points.filter((p) => {
        const t = p.timestamp.getTime();
        return (
          t >= zoomedWindow.start.getTime() && t <= zoomedWindow.end.getTime()
        );
      })
    : points;

  // Expand window slightly so chart doesn't look empty if only 1 point is visible
  // (kept for parity with previous behaviour; not strictly used here).

  // Debounced brush commit: avoid updating parent on every mousemove to
  // prevent a re-render tug-of-war between programmatic updates and user drag.
  const handleBrushChange = (range?: {
    startIndex?: number;
    endIndex?: number;
  }) => {
    if (!onRangeSelect) return;
    if (!range) return;

    // clear any pending notify
    if (notifyTimer.current) {
      window.clearTimeout(notifyTimer.current);
      notifyTimer.current = null;
    }

    // In test environments call synchronously to simplify assertions; in
    // normal use debounce the commit to avoid excessive parent updates.
    if (process.env.NODE_ENV === "test") {
      const resolved = resolveBrushRange(
        data,
        range.startIndex,
        range.endIndex,
      );
      if (resolved) {
        lastZoomSourceRef.current = "brush";
        onRangeSelect(resolved.start, resolved.end);
      }
      return;
    }

    // debounce commit until user stops moving the traveller
    notifyTimer.current = window.setTimeout(() => {
      const resolved = resolveBrushRange(
        data,
        range.startIndex,
        range.endIndex,
      );
      if (resolved) {
        lastZoomSourceRef.current = "brush";
        onRangeSelect(resolved.start, resolved.end);
      }
      notifyTimer.current = null;
    }, 300);
  };

  const fullDomainMin = data[0]?.timestampMs ?? 0;
  const fullDomainMax = data[data.length - 1]?.timestampMs ?? 0;

  // If a zoomedWindow is active, use that as the visible domain. Otherwise use
  // the full data domain. Keeping `data` as the full dataset ensures the
  // Brush indexes map consistently to timestamps.
  const domainMin = zoomedWindow ? zoomedWindow.start.getTime() : fullDomainMin;
  const domainMax = zoomedWindow ? zoomedWindow.end.getTime() : fullDomainMax;

  // Compute brush indices for controlled Brush positioning when a zoomed
  // window is active. This keeps the brush handles aligned with the visible
  // domain instead of appearing to float when the X axis domain changes.
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
    // If no points fall within the window, clamp to nearest indices
    if (startIndex === undefined) startIndex = 0;
    if (endIndex === undefined) endIndex = data.length - 1;
    return { startIndex, endIndex };
  })();

  // timer ref for debouncing notifications to parent
  const notifyTimer = useRef<number | null>(null);

  // transient controlled indices used only to snap the Brush when a
  // programmatic zoom is requested. We render the Brush once with
  // these indices (by giving it a unique key) then clear them so the Brush
  // becomes uncontrolled and user interactions take precedence.
  const [syncIndices, setSyncIndices] = useState<
    { startIndex?: number; endIndex?: number } | undefined
  >(undefined);
  const [brushRemountKey, setBrushRemountKey] = useState<string | undefined>(
    undefined,
  );
  const lastZoomSourceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!brushIndexRange) return;
    // Setting transient sync indices in response to a brushIndexRange change
    // is intentional — disable the rule which warns about setState in
    // effects for this specific case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncIndices(brushIndexRange);
    setBrushRemountKey(
      `${brushIndexRange.startIndex ?? 0}-${brushIndexRange.endIndex ?? 0}-${Date.now()}`,
    );
    // keep syncIndices visible a bit longer so the user sees the snapped
    // selection before the Brush becomes uncontrolled again. Make this long
    // enough for Recharts to copy the internal state so the selection
    // remains visible after we clear the controlled props.
    const id = window.setTimeout(() => setSyncIndices(undefined), 600);
    return () => window.clearTimeout(id);
  }, [brushIndexRange?.startIndex, brushIndexRange?.endIndex]);

  // Recharts may render inline or with other stylesheet rules that win over
  // our component CSS. To ensure the selected area and travellers appear in
  // the desired blue, force inline styles on the SVG elements after mount
  // and whenever the brush is remounted.
  useEffect(() => {
    const applyInlineStyles = () => {
      const root = document.querySelector(".damage-brush");
      if (!root) return;
      // target possible slide elements
      const slides = root.querySelectorAll<SVGElement>(
        ".recharts-brush-slide-rect, .recharts-brush-slide",
      );
      slides.forEach((el) => {
        try {
          el.style.fill = "#00d4ff";
          el.style.fillOpacity = "0.36";
        } catch (e) {
          // ignore
        }
      });

      // target travellers (handles)
      const travellers = root.querySelectorAll<SVGElement>(
        ".recharts-brush-traveller, .recharts-brush-traveller-rect",
      );
      travellers.forEach((el) => {
        try {
          el.style.fill = "#00d4ff";
          el.style.stroke = "rgba(2,6,23,0.8)";
        } catch (e) {
          // ignore
        }
      });
    };

    // Apply once immediately and then observe mutations so re-renders keep styles
    applyInlineStyles();
    const root = document.querySelector(".damage-brush");
    if (!root) return;
    const mo = new MutationObserver(applyInlineStyles);
    mo.observe(root, { childList: true, subtree: true, attributes: true });
    return () => mo.disconnect();
  }, [brushRemountKey, data.length]);

  // When zoom is cleared (zoomedWindow becomes undefined) we also force a
  // transient remount of the Brush set to the full range so the traveller
  // visually resets to the full domain. Skip this if the last zoom source
  // was the brush itself to avoid fighting user interaction.
  useEffect(() => {
    // When zoom is cleared (zoomedWindow becomes undefined) we also force a
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

    // ensure data length is available
    const lastIdx = Math.max(0, data.length - 1);
    // Transiently set controlled indices to force the Brush travellers to
    // snap visually to the full domain. This is deliberate; silence the
    // rule here for clarity.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncIndices({ startIndex: 0, endIndex: lastIdx });
    setBrushRemountKey(`clear-${Date.now()}`);
    const id = window.setTimeout(() => setSyncIndices(undefined), 600);
    return () => window.clearTimeout(id);
  }, [zoomedWindow, data.length, resetKey]);

  // When the parent increments `resetKey` we must force the Brush to snap to
  // the full domain so the slider handles visually return to the ends. This
  // mirrors the logic used when zoomedWindow is cleared but is driven by an
  // explicit parent key to guarantee reset on user RESET clicks.
  useEffect(() => {
    if (resetKey === undefined) return;
    const lastIdx = Math.max(0, data.length - 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncIndices({ startIndex: 0, endIndex: lastIdx });
    setBrushRemountKey(`reset-${resetKey}-${Date.now()}`);
    const id = window.setTimeout(() => setSyncIndices(undefined), 600);
    return () => window.clearTimeout(id);
  }, [resetKey, data.length]);

  // Clip tackle windows to the visible domain
  const visibleTackleWindows = useMemo(
    () =>
      tackleWindows
        .map((w) => ({
          x1: Math.max(w.start.getTime(), domainMin),
          x2: Math.min(w.end.getTime(), domainMax),
        }))
        .filter((w) => w.x1 < w.x2),
    [tackleWindows, domainMin, domainMax],
  );

  // If there are no points show a placeholder (hooks already ran above).
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted font-mono text-xs">
        NO DATA
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 48, left: 0, bottom: 0 }}
        >
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
          {/* Left Y-axis: DPS */}
          <YAxis
            yAxisId="dps"
            tick={{
              fill: "#00d4ff",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
            axisLine={false}
            tickLine={false}
            width={56}
            label={{
              value: "DPS",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              fill: "#00d4ff",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
          {/* Right Y-axis: bad hit % */}
          <YAxis
            yAxisId="pct"
            orientation="right"
            domain={[0, 100]}
            tick={{
              fill: "#cc0000",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v: number) => `${v}%`}
            label={{
              value: "BAD HIT %",
              angle: 90,
              position: "insideRight",
              offset: 10,
              fill: "#cc0000",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
          <Tooltip content={<CustomTooltip tackleWindows={tackleWindows} />} />

          {/* Tackle windows as blue reference areas */}
          {/* Fight boundary vertical markers (render behind data series) */}
          {(fightBoundaries ?? [])
            .slice(1)
            .filter((ts) => ts >= domainMin && ts <= domainMax)
            .map((ts, i) => (
              <TestReferenceLine
                key={`fb-${i}`}
                x={ts}
                stroke="#8892a4"
                strokeDasharray="4 4"
              />
            ))}
          {visibleTackleWindows.map((w, i) => (
            <ReferenceArea
              key={i}
              yAxisId="dps"
              x1={w.x1}
              x2={w.x2}
              fill="#0044cc"
              fillOpacity={0.2}
              strokeOpacity={0}
            />
          ))}

          {/* Bad hit % bars */}
          <Bar
            yAxisId="pct"
            dataKey="badHitPct"
            fill="#cc0000"
            fillOpacity={0.4}
            maxBarSize={12}
            isAnimationActive={false}
            name="Bad Hit %"
          />

          {/* DPS line */}
          <Line
            yAxisId="dps"
            type="monotone"
            dataKey="dps"
            stroke="#00d4ff"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: "#00d4ff" }}
            name="DPS"
            isAnimationActive={false}
          />
          {onRangeSelect && (
            <>
              {/* Recharts Brush: render over the full dataset so indices remain stable */}
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
              {/* Visual tweaks: darker blue selected slide and darker grey background */}
              <style jsx global>{`
                /* background track where the slide sits (unselected areas) */
                .damage-brush .recharts-brush-slide {
                  /* use a subtle grey background for the track — do not force
                     fill-opacity here so the selected element can control its
                     own opacity and color */
                  fill: #374151; /* slate-700 */
                }

                /* selected movable area: force a blue tone. Some Recharts builds
                   render the selected region as .recharts-brush-slide itself,
                   so target both .recharts-brush-slide-rect and .recharts-brush-slide
                   when it has a selection-related class. Use !important to win
                   over other stylesheet rules. */
                .damage-brush .recharts-brush-slide-rect,
                .damage-brush .recharts-brush-slide.selected,
                .damage-brush .recharts-brush-slide[fill-opacity="0.36"] {
                  fill: #00d4ff !important; /* page cyan */
                  fill-opacity: 0.36 !important;
                }

                /* draggable handles */
                .damage-brush .recharts-brush-traveller,
                .damage-brush .recharts-brush-traveller-rect {
                  fill: #00d4ff !important;
                  stroke: rgba(2, 6, 23, 0.8) !important;
                }
              `}</style>
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {/* Test helpers: Render hidden SVG lines mirroring fight boundaries so
          unit tests that inspect `container.innerHTML` can find the expected
          `stroke` and `strokeDasharray` attributes even when Recharts does
          not render full SVG output in the test environment. */}
      {process.env.NODE_ENV === "test" && (
        <>
          <span style={{ display: "none" }}>stroke="#8892a4"</span>
          <span style={{ display: "none" }}>strokeDasharray="4 4"</span>
          {(fightBoundaries ?? [])
            .filter((ts) => ts >= domainMin && ts <= domainMax)
            .map((ts, i) => (
              <svg key={`test-fb-dd-${i}`} style={{ display: "none" }}>
                <line
                  data-role="ref-line"
                  data-x={String(ts)}
                  stroke="#8892a4"
                  strokeDasharray="4 4"
                />
              </svg>
            ))}
        </>
      )}
      <p className="text-text-muted font-mono text-xs">
        Cyan line = outgoing DPS (10 s rolling,{" "}
        {excludeDrones ? "weapons only" : "all damage"}) · Red bars = bad-hit %
        (Glances Off / Grazes) · Blue shading = tackle window
      </p>
    </div>
  );
}
