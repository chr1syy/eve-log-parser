"use client";

import { useState } from "react";
import type { HitQuality } from "@/lib/types";

// Ordered from best to worst — matches EVE combat log tiers.
const QUALITY_ORDER: HitQuality[] = [
  "Wrecks",
  "Smashes",
  "Penetrates",
  "Hits",
  "Glances Off",
  "Grazes",
  "misses",
];

const QUALITY_COLOR: Record<HitQuality, string> = {
  Wrecks: "#ef4444",
  Smashes: "#f59e0b",
  Penetrates: "#eab308",
  Hits: "#e5e7eb",
  "Glances Off": "#9ca3af",
  Grazes: "#6b7280",
  misses: "#4b5563",
  unknown: "#4b5563",
};

const QUALITY_LABEL: Record<HitQuality, string> = {
  Wrecks: "Wrecks",
  Smashes: "Smashes",
  Penetrates: "Penetrates",
  Hits: "Hits",
  "Glances Off": "Glances Off",
  Grazes: "Grazes",
  misses: "Misses",
  unknown: "Unknown",
};

interface HitQualityTooltipProps {
  hitQualities: Partial<Record<HitQuality, number>>;
  totalHits: number;
  children: React.ReactNode;
}

export default function HitQualityTooltip({
  hitQualities,
  totalHits,
  children,
}: HitQualityTooltipProps) {
  const [visible, setVisible] = useState(false);
  const entries = QUALITY_ORDER.map(
    (q) => [q, hitQualities[q] ?? 0] as const,
  ).filter(([, n]) => n > 0);

  if (entries.length === 0) {
    return <>{children}</>;
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="underline decoration-dotted decoration-[#555] underline-offset-2 cursor-help">
        {children}
      </span>
      {visible && (
        <span
          role="tooltip"
          className="absolute right-0 bottom-full mb-1.5 z-50 pointer-events-none bg-overlay border border-border-active rounded-sm p-2 shadow-xl min-w-[180px]"
        >
          <span className="block text-[10px] uppercase tracking-widest text-text-muted mb-1 font-ui">
            Hit Quality
          </span>
          <span className="block font-mono text-xs space-y-0.5">
            {entries.map(([q, n]) => {
              const pct = totalHits > 0 ? (n / totalHits) * 100 : 0;
              return (
                <span
                  key={q}
                  className="flex items-center justify-between gap-3"
                >
                  <span style={{ color: QUALITY_COLOR[q] }}>
                    {QUALITY_LABEL[q]}
                  </span>
                  <span className="text-text-primary tabular-nums">
                    {n.toLocaleString()}{" "}
                    <span className="text-text-muted">
                      ({pct.toFixed(1)}%)
                    </span>
                  </span>
                </span>
              );
            })}
          </span>
        </span>
      )}
    </span>
  );
}
