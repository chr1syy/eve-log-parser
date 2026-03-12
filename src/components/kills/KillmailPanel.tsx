"use client";

import Panel from "@/components/ui/Panel";
import Badge from "@/components/ui/Badge";
import Tooltip from "@/components/ui/Tooltip";
import { ExternalLink } from "lucide-react";
import type { MatchedKillmail } from "@/lib/analysis/killmailMatcher";

interface KillmailPanelProps {
  matches: MatchedKillmail[];
  isLoading: boolean;
  error: string | null;
}

function formatIsk(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const confidenceBadge: Record<
  "high" | "medium" | "low",
  { variant: "green" | "gold" | "red"; label: string }
> = {
  high: { variant: "green", label: "HIGH" },
  medium: { variant: "gold", label: "MED" },
  low: { variant: "red", label: "LOW" },
};

const thClass =
  "bg-panel text-text-secondary uppercase tracking-widest text-xs font-ui border-b border-border px-3 py-2 text-left";

export default function KillmailPanel({
  matches,
  isLoading,
  error,
}: KillmailPanelProps) {
  if (isLoading) {
    return (
      <Panel title="KILLMAIL MATCHES">
        <div className="py-8 text-center">
          <span className="text-text-muted font-mono text-xs uppercase tracking-widest animate-pulse">
            Searching for killmails...
          </span>
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="KILLMAIL MATCHES">
        <div className="py-8 text-center">
          <span className="text-status-kill font-mono text-xs">{error}</span>
        </div>
      </Panel>
    );
  }

  if (matches.length === 0) {
    return (
      <Panel title="KILLMAIL MATCHES">
        <div className="py-8 text-center">
          <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
            No matching killmails found
          </span>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="KILLMAIL MATCHES">
      <div className="overflow-auto rounded-sm border border-border">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={`${thClass} w-20`}>TIME</th>
              <th className={thClass}>VICTIM</th>
              <th className={`${thClass} text-right w-24`}>ISK VALUE</th>
              <th className={`${thClass} w-24`}>CONFIDENCE</th>
              <th className={`${thClass} w-16`}>LINK</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => {
              const badge = confidenceBadge[m.confidence];
              return (
                <tr
                  key={m.killmail.killmailId}
                  className="border-b border-border last:border-b-0 hover:bg-[#ffffff06] transition-colors"
                >
                  <td className="px-3 py-2 font-mono text-xs text-text-muted whitespace-nowrap">
                    {formatTime(m.candidateEntry.timestamp)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-text-primary">
                    {m.candidateEntry.killCandidateTarget ?? "Unknown"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gold-bright text-right whitespace-nowrap">
                    {formatIsk(m.killmail.zkbValue)}
                  </td>
                  <td className="px-3 py-2">
                    <Tooltip
                      content={
                        <span className="flex flex-col gap-0.5">
                          {m.matchReasons.map((r, i) => (
                            <span key={i}>{r}</span>
                          ))}
                        </span>
                      }
                    >
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </Tooltip>
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={m.killmail.zkillUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-glow hover:text-text-primary text-xs font-mono transition-colors"
                    >
                      <ExternalLink size={12} />
                      zKB
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
