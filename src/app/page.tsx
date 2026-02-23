"use client";

import Link from "next/link";
import { Upload, Crosshair, Shield, Clock, Activity } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import StatCard from "@/components/dashboard/StatCard";
import DamageOverTimeChart from "@/components/dashboard/DamageOverTimeChart";
import DamageBreakdownChart from "@/components/dashboard/DamageBreakdownChart";
import { useParsedLogs } from "@/hooks/useParsedLogs";
import { useAuth } from "@/contexts/AuthContext";
import { signIn } from "next-auth/react";
import type { LogEntry, LogStats, ParsedLog } from "@/lib/types";

function mergeStats(logs: ParsedLog[]): LogStats {
  const merged: LogStats = {
    totalEvents: 0,
    damageDealt: 0,
    damageReceived: 0,
    topWeapons: [],
    topTargets: [],
    hitQualityDealt: {},
    hitQualityReceived: {},
    totalRepReceived: 0,
    totalRepOutgoing: 0,
    capNeutReceived: 0,
    capNeutDealt: 0,
    capNosDrained: 0,
    activeTimeMinutes: 0,
    damageDealtByTarget: [],
    repReceivedBySource: [],
    capReceivedByShipType: [],
    capDealtByModule: [],
  };

  if (logs.length === 0) return merged;

  const weaponMap = new Map<string, { count: number; totalDamage: number }>();
  const targetMap = new Map<
    string,
    { shipType: string; totalDamage: number }
  >();

  for (const log of logs) {
    const s = log.stats;
    merged.totalEvents += s.totalEvents;
    merged.damageDealt += s.damageDealt;
    merged.damageReceived += s.damageReceived;
    merged.totalRepReceived += s.totalRepReceived;
    merged.totalRepOutgoing += s.totalRepOutgoing;
    merged.capNeutReceived += s.capNeutReceived;
    merged.capNeutDealt += s.capNeutDealt;
    merged.capNosDrained += s.capNosDrained;
    merged.activeTimeMinutes += s.activeTimeMinutes;

    for (const w of s.topWeapons) {
      const existing = weaponMap.get(w.name) ?? { count: 0, totalDamage: 0 };
      weaponMap.set(w.name, {
        count: existing.count + w.count,
        totalDamage: existing.totalDamage + w.totalDamage,
      });
    }

    for (const t of s.topTargets) {
      const existing = targetMap.get(t.name) ?? {
        shipType: t.shipType,
        totalDamage: 0,
      };
      targetMap.set(t.name, {
        shipType: t.shipType,
        totalDamage: existing.totalDamage + t.totalDamage,
      });
    }
  }

  merged.topWeapons = Array.from(weaponMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  merged.topTargets = Array.from(targetMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.totalDamage - a.totalDamage)
    .slice(0, 10);

  return merged;
}

function mergeEntries(logs: ParsedLog[]): LogEntry[] {
  return logs.flatMap((l) => l.entries);
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function DashboardPage() {
  const { activeLog } = useParsedLogs();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const hasLogs = activeLog !== null;
  const stats = mergeStats(activeLog ? [activeLog] : []);
  const allEntries = mergeEntries(activeLog ? [activeLog] : []);

  return (
    <AppLayout title="DASHBOARD">
      {!hasLogs ? (
        /* Empty state */
        <div className="flex items-center justify-center min-h-[60vh]">
          <Panel className="text-center max-w-sm w-full">
            <div className="py-8 flex flex-col items-center gap-4">
              <Activity size={40} className="text-text-muted" />
              <div>
                <h2 className="text-text-primary font-ui font-bold uppercase tracking-widest text-lg mb-2">
                  NO LOGS PARSED
                </h2>
                <p className="text-text-muted font-mono text-sm">
                  Upload EVE combat logs to begin analysis
                </p>
              </div>
              <Link href="/upload">
                <Button variant="primary" size="md" icon={<Upload size={14} />}>
                  UPLOAD LOGS
                </Button>
              </Link>
              {!authLoading && !isAuthenticated && (
                <div className="pt-4 mt-4 border-t border-border-subtle w-full">
                  <p className="text-text-muted font-mono text-xs mb-3">
                    Or save logs persistently:
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => signIn("eve-sso")}
                    className="w-full"
                  >
                    SIGN IN WITH EVE ONLINE
                  </Button>
                </div>
              )}
            </div>
          </Panel>
        </div>
      ) : (
        /* Dashboard content */
        <div className="space-y-6">
          {/* Row 1: Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Total Events"
              value={stats.totalEvents}
              icon={<Activity size={20} />}
            />
            <StatCard
              label="Damage Dealt"
              value={stats.damageDealt}
              variant="gold"
              icon={<Crosshair size={20} />}
            />
            <StatCard
              label="Damage Received"
              value={stats.damageReceived}
              variant="red"
              icon={<Shield size={20} />}
            />
            <StatCard
              label="Active Time"
              value={formatMinutes(stats.activeTimeMinutes)}
              variant="cyan"
              icon={<Clock size={20} />}
              subValue={`1 session`}
            />
          </div>

          {/* Row 2: Damage Over Time (8 cols) + Top Targets (4 cols) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-8">
              <Panel title="DAMAGE OVER TIME">
                <DamageOverTimeChart entries={allEntries} />
              </Panel>
            </div>

            <div className="xl:col-span-4">
              <Panel title="TOP TARGETS">
                {stats.topTargets.length === 0 ? (
                  <p className="text-text-muted font-mono text-xs py-4 text-center">
                    No target data
                  </p>
                ) : (
                  <div className="space-y-0">
                    {stats.topTargets.slice(0, 8).map((t, i) => (
                      <div
                        key={t.name}
                        className="flex items-center gap-2 py-1.5 border-b border-border-subtle last:border-0"
                      >
                        <span className="text-text-muted font-mono text-xs w-4 flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-mono text-xs truncate">
                            {t.name}
                          </p>
                          <p className="text-text-muted font-mono text-xs truncate">
                            {t.shipType}
                          </p>
                        </div>
                        <span className="text-gold-bright font-mono text-xs flex-shrink-0">
                          {t.totalDamage.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>

          {/* Row 3: Weapon Breakdown (6 cols) + Incoming Hit Quality (6 cols) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-6">
              <Panel title="WEAPON BREAKDOWN">
                <DamageBreakdownChart stats={stats} />
              </Panel>
            </div>

            <div className="xl:col-span-6">
              <Panel title="INCOMING HIT QUALITY">
                {Object.keys(stats.hitQualityReceived).length === 0 ? (
                  <p className="text-text-muted font-mono text-xs py-4 text-center">
                    No incoming data
                  </p>
                ) : (
                  <div className="space-y-0">
                    {(
                      Object.entries(stats.hitQualityReceived) as [
                        string,
                        number,
                      ][]
                    )
                      .sort(([, a], [, b]) => b - a)
                      .map(([quality, count]) => (
                        <div
                          key={quality}
                          className="flex items-center gap-2 py-1.5 border-b border-border-subtle last:border-0"
                        >
                          <div className="flex-1">
                            <p className="text-text-secondary font-mono text-xs">
                              {quality}
                            </p>
                          </div>
                          <span className="text-status-kill font-mono text-xs">
                            {count.toLocaleString()} hits
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
