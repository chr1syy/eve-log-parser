"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const TOOLTIP_WIDTH = 200;
const GAP = 6;

export default function HitQualityTooltip({
  hitQualities,
  totalHits,
  children,
}: HitQualityTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLSpanElement | null>(null);

  // Measure actual height once the portaled node mounts and adjust position
  // directly via the DOM to avoid a second render pass (and any flicker).
  const tooltipRef = useCallback((el: HTMLSpanElement | null) => {
    if (!el) return;
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const h = el.offsetHeight;
    const top = Math.max(8, r.top - GAP - h);
    const left = Math.max(8, r.right - TOOLTIP_WIDTH);
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  }, []);

  const entries = QUALITY_ORDER.map(
    (q) => [q, hitQualities[q] ?? 0] as const,
  ).filter(([, n]) => n > 0);

  if (entries.length === 0) {
    return <>{children}</>;
  }

  // Initial coords from an approximate height. The callback ref above refines
  // the top to the measured height once the tooltip node mounts, so a too-small
  // estimate doesn't overlap the trigger.
  const computeCoords = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const approxHeight = 32 + entries.length * 22;
    const top = Math.max(8, r.top - GAP - approxHeight);
    const left = Math.max(8, r.right - TOOLTIP_WIDTH);
    setCoords({ top, left });
  };

  return (
    <span
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => {
        computeCoords();
        setVisible(true);
      }}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="underline decoration-dotted decoration-[#555] underline-offset-2 cursor-help">
        {children}
      </span>
      {visible &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: TOOLTIP_WIDTH,
              zIndex: 9999,
              pointerEvents: "none",
            }}
            className="bg-overlay border border-border-active rounded-sm p-2 shadow-xl"
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
          </span>,
          document.body,
        )}
    </span>
  );
}
