'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Download, ExternalLink } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import Panel from '@/components/ui/Panel'
import Button from '@/components/ui/Button'
import type { ParsedLog } from '@/lib/types'

const STORAGE_KEY = 'eve-parsed-logs'

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
  }
}

function fmt(n: number) {
  return n.toLocaleString()
}

export default function SharePage() {
  const { uuid } = useParams<{ uuid: string }>()
  const [log, setLog] = useState<ParsedLog | null>(null)
  const [status, setStatus] = useState<'loading' | 'notfound' | 'error' | 'ready'>('loading')
  const [imported, setImported] = useState(false)

  useEffect(() => {
    if (!uuid) return
    fetch(`/api/logs/${uuid}`)
      .then((r) => {
        if (r.status === 404) {
          setStatus('notfound')
          return null
        }
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        if (!data) return
        setLog(rehydrate(data as ParsedLog))
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [uuid])

  const handleImport = () => {
    if (!log) return
    let existing: ParsedLog[] = []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) existing = JSON.parse(raw) as ParsedLog[]
    } catch {
      // ignore
    }
    const merged = existing.filter((l) => l.sessionId !== log.sessionId)
    merged.push(log)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    setImported(true)
  }

  if (status === 'loading') {
    return (
      <AppLayout title="SHARED LOG">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-text-muted font-mono text-sm animate-pulse">LOADING...</p>
        </div>
      </AppLayout>
    )
  }

  if (status === 'notfound') {
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
    )
  }

  if (status === 'error') {
    return (
      <AppLayout title="SHARED LOG">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Panel className="text-center max-w-sm w-full">
            <div className="py-8">
              <h2 className="text-status-kill font-ui font-bold uppercase tracking-widest text-lg mb-2">
                ERROR
              </h2>
              <p className="text-text-muted font-mono text-sm">Failed to load shared log.</p>
            </div>
          </Panel>
        </div>
      </AppLayout>
    )
  }

  if (!log) return null

  const { stats } = log

  return (
    <AppLayout title="SHARED LOG">
      <div className="max-w-2xl mx-auto space-y-6">
        <Panel variant="accent">
          <div className="space-y-3">
            <div>
              <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                Character
              </p>
              <p className="text-text-primary font-mono text-base">
                {log.characterName ?? '—'}
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
            { label: 'Total Events', value: fmt(stats.totalEvents), color: 'text-text-primary' },
            { label: 'Damage Dealt', value: fmt(stats.damageDealt), color: 'text-gold-bright' },
            { label: 'Damage Received', value: fmt(stats.damageReceived), color: 'text-status-kill' },
            { label: 'Active Time', value: `${stats.activeTimeMinutes}m`, color: 'text-cyan-glow' },
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
                <div key={w.name} className="flex justify-between font-mono text-xs">
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
          {imported ? (
            <Link href="/">
              <Button variant="primary" size="md" icon={<ExternalLink size={14} />}>
                GO TO DASHBOARD
              </Button>
            </Link>
          ) : (
            <Button
              variant="primary"
              size="md"
              icon={<Download size={14} />}
              onClick={handleImport}
            >
              IMPORT TO MY SESSION
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
