"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import CombinedChart from "@/components/charts/CombinedChart";
import type { ActiveToggles } from "@/components/charts/CombinedChart";
import RawLogPanel from "@/components/charts/RawLogPanel";
import DamagePerTargetTable from "@/components/charts/DamagePerTargetTable";
import DamageReceivedPerTargetTable from "@/components/charts/DamageReceivedPerTargetTable";
import RepsPerSourceTable from "@/components/charts/RepsPerSourceTable";
import CapPressurePerSourceTable from "@/components/charts/CapPressurePerSourceTable";
import AppLayout from "@/components/layout/AppLayout";
import Panel from "@/components/ui/Panel";
import { useParsedLogs } from "@/hooks/useParsedLogs";
import type { ParsedLog } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ToggleButton({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-3 py-1 rounded-sm font-mono text-xs border transition-colors ${
        active
          ? "text-[#0d0d0d]"
          : "bg-transparent text-[#666] border-[#333] hover:border-[#555]"
      }`}
      style={active ? { backgroundColor: color, borderColor: color } : {}}
    >
      {label}
    </button>
  );
}

export default function ChartsPage() {
  const ctx = useParsedLogs();
  const searchParams = useSearchParams();
  const sharedId = searchParams.get("shared");
  const [sharedLog, setSharedLog] = useState<ParsedLog | null>(null);
  const [sharedStatus, setSharedStatus] = useState<
    "idle" | "loading" | "error" | "notfound" | "ready"
  >("idle");
  // useParsedLogs exposes activeLog (see src/app/damage-dealt/page.tsx)
  const effectiveSharedLog = sharedId ? sharedLog : null;
  const effectiveSharedStatus = sharedId ? sharedStatus : "idle";
  const sharedLoading = !!sharedId && effectiveSharedStatus !== "ready";
  const entries = sharedId
    ? effectiveSharedStatus === "ready"
      ? effectiveSharedLog?.entries ?? []
      : []
    : ctx.activeLog?.entries ?? [];

  const [activeToggles, setActiveToggles] = useState<ActiveToggles>({
    damageOut: true,
    damageIn: true,
    capPressure: true,
    reps: true,
    tracking: true,
  });
  const [showTrackingInfo, setShowTrackingInfo] = useState(false);
  const trackingInfoRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!showTrackingInfo) return;
    const handler = (e: MouseEvent) => {
      if (!trackingInfoRef.current?.contains(e.target as Node)) {
        setShowTrackingInfo(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTrackingInfo]);

  const [brushWindow, setBrushWindow] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [brushResetKey, setBrushResetKey] = useState(0);
  const [initialBrushWindow, setInitialBrushWindow] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  useEffect(() => {
    if (!sharedId) return;

    let cancelled = false;
    const loadShared = async () => {
      try {
        if (cancelled) return;
        setSharedStatus("loading");

        const res = await fetch(`/api/shared-logs/${sharedId}`);
        if (res.status === 404) {
          if (!cancelled) setSharedStatus("notfound");
          return;
        }
        if (!res.ok) throw new Error();

        const data = (await res.json()) as { log: ParsedLog } | null;
        if (!data || cancelled) return;
        const log = data.log;
        const hydrated: ParsedLog = {
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
        setSharedLog(hydrated);
        setSharedStatus("ready");
      } catch {
        if (!cancelled) setSharedStatus("error");
      }
    };

    void loadShared();

    return () => {
      cancelled = true;
    };
  }, [sharedId]);

  const handleBrushChange = useCallback(
    (start: Date | null, end: Date | null) => {
      setBrushWindow(start && end ? { start, end } : null);
    },
    [],
  );

  const handleResetBrush = useCallback(() => {
    setBrushWindow(null);
    setInitialBrushWindow(null);
    setBrushResetKey((k) => k + 1);
  }, []);

  const handleTargetClick = useCallback((start: Date, end: Date) => {
    setBrushWindow({ start, end });
    setInitialBrushWindow({ start, end });
    setBrushResetKey((k) => k + 1);
  }, []);

  const toggleKey = (key: keyof ActiveToggles) =>
    setActiveToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  if (sharedId && effectiveSharedStatus === "loading") {
    return (
      <AppLayout title="COMBINED CHART">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-text-muted font-mono text-sm animate-pulse">
            LOADING SHARED LOG...
          </p>
        </div>
      </AppLayout>
    );
  }

  if (sharedId && effectiveSharedStatus === "notfound") {
    return (
      <AppLayout title="COMBINED CHART">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Panel className="text-center max-w-sm w-full">
            <div className="py-8">
              <h2 className="text-text-primary font-ui font-bold uppercase tracking-widest text-lg mb-2">
                LOG NOT FOUND
              </h2>
              <p className="text-text-muted font-mono text-sm">
                This share link is invalid or has expired.
              </p>
            </div>
          </Panel>
        </div>
      </AppLayout>
    );
  }

  if (sharedId && effectiveSharedStatus === "error") {
    return (
      <AppLayout title="COMBINED CHART">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Panel className="text-center max-w-sm w-full">
            <div className="py-8">
              <h2 className="text-status-kill font-ui font-bold uppercase tracking-widest text-lg mb-2">
                ERROR
              </h2>
              <p className="text-text-muted font-mono text-sm">
                Failed to load shared log.
              </p>
            </div>
          </Panel>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="COMBINED CHART">
      <div className="flex flex-col gap-3">
        {sharedId && (
          <Panel variant="accent">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                  Viewing Shared Log
                </p>
                <p className="text-text-primary font-mono text-sm">
                  Read-only view from share link
                </p>
              </div>
              <Link
                href="/"
                className="text-xs font-mono uppercase tracking-widest text-cyan-glow hover:text-text-primary transition-colors"
              >
                Back To My Logs
              </Link>
            </div>
          </Panel>
        )}
        {/* Toggle bar */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs text-[#888] uppercase tracking-widest mr-2">
            Show:
          </span>

          <ToggleButton
            label="Damage Out"
            active={activeToggles.damageOut}
            color="#00d4ff"
            onClick={() => toggleKey("damageOut")}
          />
          <ToggleButton
            label="Damage In"
            active={activeToggles.damageIn}
            color="#e53e3e"
            onClick={() => toggleKey("damageIn")}
          />
          <ToggleButton
            label="Cap Pressure"
            active={activeToggles.capPressure}
            color="#e58c00"
            onClick={() => toggleKey("capPressure")}
          />
          <ToggleButton
            label="Reps"
            active={activeToggles.reps}
            color="#66cc66"
            onClick={() => toggleKey("reps")}
          />
          <ToggleButton
            label="Tracking"
            active={activeToggles.tracking}
            color="#16a34a"
            onClick={() => toggleKey("tracking")}
          />
          <div ref={trackingInfoRef} className="relative flex items-center">
            <button
              type="button"
              onClick={() => setShowTrackingInfo((v) => !v)}
              className="w-4 h-4 rounded-full border border-[#444] text-[#555] hover:text-[#aaa] hover:border-[#666] font-mono text-[10px] flex items-center justify-center transition-colors leading-none"
              aria-label="Tracking quality info"
            >
              ?
            </button>
            {showTrackingInfo && (
              <div className="absolute top-6 left-0 z-50 w-72 bg-[#1a1a1a] border border-[#333] rounded-sm p-3 font-mono text-[11px] shadow-xl">
                <p className="text-[#ddd] font-bold mb-2 uppercase tracking-wider text-[10px]">
                  Tracking Quality
                </p>
                <p className="text-[#888] mb-2 leading-relaxed">
                  Rolling 10-second average of turret tracking performance,
                  using the damage multiplier as a proxy. Only visible for logs
                  with turret weapons.
                </p>
                <div className="space-y-1">
                  <p>
                    <span className="text-[#16a34a]">● High (&ge;1.0)</span>
                    <span className="text-[#666]">
                      {" "}
                      — full damage, good angular tracking
                    </span>
                  </p>
                  <p>
                    <span className="text-[#eab308]">● Mid (0.7–1.0)</span>
                    <span className="text-[#666]">
                      {" "}
                      — partial tracking loss
                    </span>
                  </p>
                  <p>
                    <span className="text-[#dc2626]">● Low (&lt;0.7)</span>
                    <span className="text-[#666]">
                      {" "}
                      — poor tracking, significant damage reduction
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
          {brushWindow && (
            <button
              type="button"
              onClick={handleResetBrush}
              className="ml-auto px-3 py-1 font-mono text-xs border border-[#e53e3e] text-[#e53e3e] bg-transparent hover:bg-[#e53e3e] hover:text-[#0d0d0d] rounded-sm transition-colors"
            >
              Reset Zoom
            </button>
          )}
        </div>

        {/* Chart + raw log panel side by side */}
        <div className="flex gap-3 items-stretch h-[492px]">
          <Panel title="CHART" className="flex-1 min-w-0">
            {sharedLoading ? (
              <div className="flex items-center justify-center h-[420px] text-[#666] font-mono text-sm animate-pulse">
                Loading...
              </div>
            ) : (
              <CombinedChart
                entries={entries}
                activeToggles={activeToggles}
                onBrushChange={handleBrushChange}
                brushResetKey={brushResetKey}
                initialBrushWindow={initialBrushWindow}
              />
            )}
          </Panel>
          <div className="w-[560px] shrink-0 flex flex-col">
            {sharedLoading ? (
              <Panel
                title="RAW LOG"
                className="flex items-center justify-center h-[420px]"
              >
                <p className="text-[#666] font-mono text-sm animate-pulse">
                  Loading...
                </p>
              </Panel>
            ) : (
              <RawLogPanel
                entries={entries}
                brushWindow={brushWindow}
                activeToggles={activeToggles}
              />
            )}
          </div>
        </div>

        {/* Damage per target table — only when Damage Out toggle is active */}
        {!sharedLoading && activeToggles.damageOut && (
          <DamagePerTargetTable
            entries={entries}
            brushWindow={brushWindow}
            onTargetClick={handleTargetClick}
          />
        )}

        {/* Damage received per attacker table — only when Damage In toggle is active */}
        {!sharedLoading && activeToggles.damageIn && (
          <DamageReceivedPerTargetTable
            entries={entries}
            brushWindow={brushWindow}
            onAttackerClick={handleTargetClick}
          />
        )}

        {/* Reps by source table — only when Reps toggle is active */}
        {!sharedLoading && activeToggles.reps && (
          <RepsPerSourceTable
            entries={entries}
            brushWindow={brushWindow}
            onSourceClick={handleTargetClick}
          />
        )}

        {/* Cap pressure by source table — only when Cap Pressure toggle is active */}
        {!sharedLoading && activeToggles.capPressure && (
          <CapPressurePerSourceTable
            entries={entries}
            brushWindow={brushWindow}
            onSourceClick={handleTargetClick}
          />
        )}
      </div>
    </AppLayout>
  );
}
