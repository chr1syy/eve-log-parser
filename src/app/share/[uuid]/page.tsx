"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import type { ParsedLog } from "@/lib/types";

/** Re-hydrate ISO date strings back to Date objects after JSON.parse */
function rehydrate(log: ParsedLog): ParsedLog {
  return {
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
}

function fmt(n: number) {
  return n.toLocaleString();
}

function formatMinutes(minutes: number): string {
  const mins = Math.round(minutes);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function SharePage() {
  const { uuid } = useParams<{ uuid: string }>();
  const [log, setLog] = useState<ParsedLog | null>(null);
  const [status, setStatus] = useState<
    "loading" | "notfound" | "error" | "ready"
  >("loading");

  useEffect(() => {
    if (!uuid) return;
    fetch(`/api/shared-logs/${uuid}`)
      .then((r) => {
        if (r.status === 404) {
          setStatus("notfound");
          return null;
        }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setLog(rehydrate((data as { log: ParsedLog }).log));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [uuid]);

  if (status === "loading") {
    return (
      <AppLayout title="SHARED LOG">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-text-muted font-mono text-sm animate-pulse">
            LOADING...
          </p>
        </div>
      </AppLayout>
    );
  }

  if (status === "notfound") {
    return (
      <AppLayout title="SHARED LOG">
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

  if (status === "error") {
    return (
      <AppLayout title="SHARED LOG">
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

  if (!log) return null;

  const { stats } = log;

  return (
    <AppLayout title="SHARED LOG">
      <div className="max-w-5xl mx-auto space-y-6">
        <Panel variant="accent">
          <div className="space-y-3">
            <div>
              <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                Character
              </p>
              <p className="text-text-primary font-mono text-base">
                {log.characterName ?? "—"}
              </p>
            </div>
            {log.sessionStart && (
              <div>
                <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                  Session Start
                </p>
                <p className="text-text-secondary font-mono text-sm">
                  {log.sessionStart.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </Panel>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Events",
              value: fmt(stats.totalEvents),
              color: "text-text-primary",
            },
            {
              label: "Damage Dealt",
              value: fmt(stats.damageDealt),
              color: "text-gold-bright",
            },
            {
              label: "Damage Received",
              value: fmt(stats.damageReceived),
              color: "text-status-kill",
            },
            {
              label: "Active Time",
              value: formatMinutes(stats.activeTimeMinutes),
              color: "text-cyan-glow",
            },
          ].map(({ label, value, color }) => (
            <Panel key={label}>
              <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-1">
                {label}
              </p>
              <p className={`font-mono text-lg font-bold ${color}`}>{value}</p>
            </Panel>
          ))}
        </div>

        {stats.topWeapons.length > 0 && (
          <Panel title="TOP WEAPONS">
            <div className="space-y-1">
              {stats.topWeapons.slice(0, 5).map((w) => (
                <div
                  key={w.name}
                  className="flex justify-between font-mono text-xs"
                >
                  <span className="text-text-secondary truncate">{w.name}</span>
                  <span className="text-gold-bright ml-4 flex-shrink-0">
                    {fmt(w.totalDamage)} dmg
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <div className="flex gap-3">
          <Button
            asChild
            variant="primary"
            size="md"
            icon={<ExternalLink size={14} />}
          >
            <Link href={`/charts?shared=${uuid}`}>SHOW IN CHARTS</Link>
          </Button>
          <Button
            asChild
            variant="primary"
            size="md"
            icon={<ExternalLink size={14} />}
          >
            <Link href="/">BACK TO MY LOGS</Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
