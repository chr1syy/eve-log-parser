'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Upload, Sword } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import Panel from '@/components/ui/Panel';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/ui/DataTable';
import type { Column } from '@/components/ui/DataTable';
import { useParsedLogs } from '@/hooks/useParsedLogs';
import { analyzeDamageDealt } from '@/lib/analysis/damageDealt';
import type { TargetEngagement, WeaponApplicationSummary } from '@/lib/analysis/damageDealt';
import type { HitQuality } from '@/lib/types';
import { cn } from '@/lib/utils';

// Hit quality ordered display config
const HIT_QUALITY_ORDER: HitQuality[] = [
  'Wrecks',
  'Smashes',
  'Penetrates',
  'Hits',
  'Glances Off',
  'Grazes',
  'Barely Scratches',
]

function hitQualityColor(hq: HitQuality): string {
  switch (hq) {
    case 'Wrecks':
    case 'Smashes':
      return 'text-gold-bright'
    case 'Penetrates':
    case 'Hits':
      return 'text-cyan-glow'
    case 'Glances Off':
    case 'Grazes':
      return 'text-text-muted'
    case 'Barely Scratches':
      return 'text-status-kill'
    default:
      return 'text-text-secondary'
  }
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function fmtDps(n: number): string {
  if (n === 0) return '—'
  return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

// --- Engagement table row type ---
type EngagementRow = TargetEngagement & { _maxDps: number }

function buildEngagementColumns(maxDps: number): Column<Record<string, unknown>>[] {
  return [
    {
      key: 'target',
      label: 'Target',
      sortable: true,
      render: (_, row) => {
        const r = row as unknown as EngagementRow
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-text-primary font-mono text-xs">{r.target}</span>
            {r.shipType && r.shipType !== r.target && (
              <Badge variant="default">{r.shipType}</Badge>
            )}
          </div>
        )
      },
    },
    {
      key: 'corp',
      label: 'Corp',
      sortable: true,
      render: (v) => v ? <Badge variant="cyan">{String(v)}</Badge> : <span className="text-text-muted">—</span>,
    },
    {
      key: 'firstHit',
      label: 'Window',
      render: (_, row) => {
        const r = row as unknown as EngagementRow
        return (
          <span className="font-mono text-xs text-text-secondary">
            {fmtTime(r.firstHit)}–{fmtTime(r.lastHit)}
          </span>
        )
      },
    },
    {
      key: 'windowSeconds',
      label: 'Secs',
      sortable: true,
      numeric: true,
      render: (v) => {
        const n = v as number
        return <span className="font-mono text-xs text-text-secondary">{n.toFixed(1)}</span>
      },
    },
    {
      key: 'totalDamage',
      label: 'Total Dmg',
      sortable: true,
      numeric: true,
      render: (v) => <span className="font-mono text-xs text-gold-bright font-bold">{fmt(v as number)}</span>,
    },
    {
      key: 'dps',
      label: 'DPS',
      sortable: true,
      numeric: true,
      render: (v, row) => {
        const dps = v as number
        const r = row as unknown as EngagementRow
        const pct = maxDps > 0 && dps > 0 ? (dps / maxDps) * 100 : 0
        return (
          <div className="flex flex-col gap-1 min-w-[80px]">
            <span className="font-mono text-xs text-cyan-glow font-bold">{fmtDps(dps)}</span>
            {pct > 0 && (
              <div className="h-1 rounded-full bg-space overflow-hidden w-full">
                <div
                  className="h-full bg-cyan-glow rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'hitCount',
      label: 'Hits',
      sortable: true,
      numeric: true,
      render: (v) => <span className="font-mono text-xs">{fmt(v as number)}</span>,
    },
    {
      key: 'minHit',
      label: 'Min',
      sortable: true,
      numeric: true,
      render: (v) => <span className="font-mono text-xs text-status-safe">{fmt(v as number)}</span>,
    },
    {
      key: 'maxHit',
      label: 'Max',
      sortable: true,
      numeric: true,
      render: (v) => <span className="font-mono text-xs text-status-kill">{fmt(v as number)}</span>,
    },
    {
      key: 'avgHit',
      label: 'Avg',
      sortable: true,
      numeric: true,
      render: (v) => <span className="font-mono text-xs text-text-secondary">{fmt(v as number)}</span>,
    },
  ]
}

// --- Weapon table ---
type WeaponRow = WeaponApplicationSummary & Record<string, unknown>

function WeaponTable({ summaries, emptyMessage }: { summaries: WeaponApplicationSummary[]; emptyMessage: string }) {
  if (summaries.length === 0) {
    return (
      <p className="text-text-muted font-mono text-xs uppercase tracking-widest text-center py-6">
        {emptyMessage}
      </p>
    )
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'weapon',
      label: 'Weapon / Ammo',
      sortable: true,
      render: (v) => <span className="font-mono text-xs text-text-primary">{String(v)}</span>,
    },
    {
      key: 'hitCount',
      label: 'Hits',
      sortable: true,
      numeric: true,
      render: (v) => <span className="font-mono text-xs">{fmt(v as number)}</span>,
    },
    {
      key: 'totalDamage',
      label: 'Total Dmg',
      sortable: true,
      numeric: true,
      render: (v) => <span className="font-mono text-xs text-gold-bright font-bold">{fmt(v as number)}</span>,
    },
    {
      key: 'minHit',
      label: 'Min',
      sortable: true,
      numeric: true,
      render: (v) => <span className="font-mono text-xs text-status-safe">{fmt(v as number)}</span>,
    },
    {
      key: 'maxHit',
      label: 'Max',
      sortable: true,
      numeric: true,
      render: (v) => <span className="font-mono text-xs text-status-kill">{fmt(v as number)}</span>,
    },
    {
      key: 'avgHit',
      label: 'Avg',
      sortable: true,
      numeric: true,
      render: (v) => <span className="font-mono text-xs text-text-secondary">{fmt(v as number)}</span>,
    },
    ...HIT_QUALITY_ORDER.map((hq) => ({
      key: `hq_${hq}`,
      label: hq,
      sortable: false,
      numeric: true,
      render: (_v: unknown, row: Record<string, unknown>) => {
        const weaponRow = row as WeaponRow
        const count = weaponRow.hitQualities[hq]
        if (!count) return <span className="text-text-muted font-mono text-xs">—</span>
        return (
          <span className={cn('font-mono text-xs font-bold', hitQualityColor(hq))}>
            {count}
          </span>
        )
      },
    })),
  ]

  // Flatten hitQualities into row keys for DataTable
  const rows = summaries.map((s) => {
    const row: Record<string, unknown> = { ...s }
    for (const hq of HIT_QUALITY_ORDER) {
      row[`hq_${hq}`] = s.hitQualities[hq] ?? null
    }
    return row
  })

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(_, i) => String(i)}
    />
  )
}

export default function DamageDealtPage() {
  const { activeLogs } = useParsedLogs()
  const hasLogs = activeLogs.length > 0

  const analysis = useMemo(() => {
    if (!hasLogs) return null
    return analyzeDamageDealt(activeLogs[0].entries)
  }, [activeLogs, hasLogs])

  const maxDps = useMemo(() => {
    if (!analysis) return 0
    return Math.max(0, ...analysis.engagements.map((e) => e.dps))
  }, [analysis])

  const engagementRows: Record<string, unknown>[] = useMemo(() => {
    if (!analysis) return []
    return analysis.engagements.map((e) => ({ ...e, _maxDps: maxDps } as Record<string, unknown>))
  }, [analysis, maxDps])

  const engagementColumns = useMemo(
    () => buildEngagementColumns(maxDps),
    [maxDps],
  )

  // Stat card values
  const bestHit = analysis
    ? Math.max(0, ...analysis.engagements.map((e) => e.maxHit))
    : 0
  const worstHit = analysis && analysis.engagements.length > 0
    ? Math.min(...analysis.engagements.map((e) => e.minHit))
    : 0
  const avgHit = analysis && analysis.totalHits > 0
    ? analysis.totalDamageDealt / analysis.totalHits
    : 0

  return (
    <AppLayout title="DAMAGE APPLICATION">
      {!hasLogs ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Panel className="text-center max-w-sm w-full">
            <div className="py-8 flex flex-col items-center gap-4">
              <div>
                <h2 className="text-text-primary font-ui font-bold uppercase tracking-widest text-lg mb-2">
                  NO LOGS PARSED
                </h2>
                <p className="text-text-muted font-mono text-sm">
                  Upload EVE combat logs to analyze damage output
                </p>
              </div>
              <Link href="/upload">
                <Button variant="primary" size="md" icon={<Upload size={14} />}>
                  UPLOAD LOGS
                </Button>
              </Link>
            </div>
          </Panel>
        </div>
      ) : analysis && analysis.totalHits === 0 ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Panel className="text-center max-w-sm w-full">
            <div className="py-8">
              <Sword className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <h2 className="text-text-primary font-ui font-bold uppercase tracking-widest text-lg mb-2">
                NO DAMAGE DEALT
              </h2>
              <p className="text-text-muted font-mono text-sm">
                No outgoing damage events found in the parsed logs
              </p>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 3 — Stat cards (shown at top for quick overview) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Best Single Hit"
              value={bestHit}
              variant="gold"
            />
            <StatCard
              label="Worst Hit"
              value={worstHit}
              variant="default"
            />
            <StatCard
              label="Average Hit"
              value={Math.round(avgHit)}
              variant="cyan"
            />
            <StatCard
              label="Total Hits"
              value={analysis?.totalHits ?? 0}
              variant="default"
            />
            <StatCard
              label="Total Damage Dealt"
              value={analysis?.totalDamageDealt ?? 0}
              variant="gold"
            />
          </div>

          {/* Section 1 — DPS per target */}
          <Panel title="DPS PER TARGET">
            <DataTable
              columns={engagementColumns}
              data={engagementRows}
              searchable
              searchPlaceholder="SEARCH TARGETS..."
              rowKey={(_, i) => String(i)}
              emptyState={
                <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
                  NO TARGETS
                </span>
              }
            />
          </Panel>

          {/* Section 2 — Weapon hit quality */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Panel title="WEAPONS &amp; AMMO">
              <WeaponTable
                summaries={analysis?.weaponSummaries ?? []}
                emptyMessage="NO WEAPON DAMAGE RECORDED"
              />
            </Panel>
            <Panel title="DRONES">
              <WeaponTable
                summaries={analysis?.droneSummaries ?? []}
                emptyMessage="NO DRONE DAMAGE RECORDED"
              />
            </Panel>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
