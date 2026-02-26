// Small chart helpers shared across charts
import type { CSSProperties } from "react";

export function renderVerticalMarkers(
  svgContainer: SVGElement | null,
  timestamps: number[] | undefined,
  style?: Partial<CSSProperties>,
) {
  if (!svgContainer || !timestamps || timestamps.length === 0) return;
  // Remove existing markers to keep idempotent
  const existing = svgContainer.querySelectorAll('[data-role="v-marker"]');
  existing.forEach((n) => n.remove());

  const svgNS = "http://www.w3.org/2000/svg";
  const bbox = svgContainer.getBoundingClientRect();

  for (const ts of timestamps) {
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("data-role", "v-marker");
    // Positioning will need to be performed by caller (Recharts maps x->pixel).
    // We leave x1/x2 unset; callers may set them via attr or CSS transform.
    line.setAttribute("stroke", (style?.color as string) ?? "#8892a4");
    // strokeDasharray in CSSProperties may be number|string; coerce to string
    const dash = style?.strokeDasharray as unknown as string | undefined;
    line.setAttribute("stroke-dasharray", dash ?? "4 4");
    line.setAttribute("opacity", String(style?.opacity ?? 0.9));
    svgContainer.appendChild(line);
  }
}
