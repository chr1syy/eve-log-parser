"use client";

import { useState, useCallback } from "react";
import CombinedChart from "@/components/charts/CombinedChart";
import type { ActiveToggles } from "@/components/charts/CombinedChart";
import RawLogPanel from "@/components/charts/RawLogPanel";
import { useParsedLogs } from "@/hooks/useParsedLogs";

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
  // useParsedLogs exposes activeLog (see src/app/damage-dealt/page.tsx)
  const entries = ctx.activeLog?.entries ?? [];

  const [activeToggles, setActiveToggles] = useState<ActiveToggles>({
    damageOut: true,
    damageIn: true,
    capPressure: true,
    reps: true,
  });
  const [brushWindow, setBrushWindow] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const handleBrushChange = useCallback(
    (start: Date | null, end: Date | null) => {
      setBrushWindow(start && end ? { start, end } : null);
    },
    [],
  );

  const toggleKey = (key: keyof ActiveToggles) =>
    setActiveToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      {/* Toggle bar */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-xs text-[#555] uppercase tracking-widest mr-2">
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
      </div>

      {/* Chart + raw log panel side by side */}
      <div className="flex flex-1 gap-3 min-h-0">
        <div className="flex-1 min-w-0">
          <CombinedChart
            entries={entries}
            activeToggles={activeToggles}
            onBrushChange={handleBrushChange}
          />
        </div>
        <div className="w-[360px] shrink-0 min-h-0 flex flex-col">
          <RawLogPanel
            entries={entries}
            brushWindow={brushWindow}
            activeToggles={activeToggles}
          />
        </div>
      </div>
    </div>
  );
}
