import type { TargetEngagement } from "@/lib/analysis/damageDealt";

export function resolveZoomedWindow(
  zoomedWindow: { start: Date; end: Date } | undefined,
  zoomedTarget: TargetEngagement | null,
): { start: Date; end: Date } | undefined {
  if (zoomedWindow) return zoomedWindow;
  if (!zoomedTarget) return undefined;
  return { start: zoomedTarget.firstHit, end: zoomedTarget.lastHit };
}
