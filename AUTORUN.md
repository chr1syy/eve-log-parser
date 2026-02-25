# Fleet Analysis — AutoRun Implementation

Execute tasks in order. Run `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH" && node node_modules/.bin/tsc --noEmit` after every phase to verify no type errors before continuing.

---

## Phase 1 — Fix data model (prerequisite for all other phases)

`mergeFleetLogs` currently overwrites `pilotName` (target/attacker name) and `shipType` (target/attacker ship) with fleet-pilot info, destroying the original data. Fix by adding dedicated fleet-pilot fields.

### Task 1.1 — Extend `LogEntry` type

**File:** `src/lib/types.ts`

Add two optional fields to the `LogEntry` interface, after the `isNpc` line:

```
  // Fleet fields — set by mergeFleetLogs; original pilotName/shipType remain untouched
  fleetPilot?: string        // the fleet member who owns this log entry
  fleetShipType?: string     // that fleet member's ship type
```

### Task 1.2 — Fix `mergeFleetLogs`

**File:** `src/lib/fleet/logMerging.ts`

Replace the enrichedEntry block (lines 88-92) so it no longer overwrites `pilotName`/`shipType`:

Old:
```ts
      const enrichedEntry: LogEntry = {
        ...entry,
        pilotName: log.pilot,
        shipType: log.shipType,
      };
```

New:
```ts
      const enrichedEntry: LogEntry = {
        ...entry,
        fleetPilot: log.pilot,
        fleetShipType: log.shipType,
      };
```

### Task 1.3 — Update `FleetDamageDealtContent.tsx` pilot references

**File:** `src/components/fleet/FleetDamageDealtContent.tsx`

In `computePerPilotDps`, change every reference that identifies the *fleet pilot* from `e.pilotName` to `e.fleetPilot ?? e.pilotName`:

- Line 55: `if (e.pilotName) pilotsSet.add(e.pilotName);`
  → `if (e.fleetPilot ?? e.pilotName) pilotsSet.add(e.fleetPilot ?? e.pilotName ?? "Unknown");`

- Line 67: `const pilot = entry.pilotName ?? "Unknown";`
  → `const pilot = entry.fleetPilot ?? entry.pilotName ?? "Unknown";`

### Task 1.4 — Update `FleetDamageTakenContent.tsx` pilot references

**File:** `src/components/fleet/FleetDamageTakenContent.tsx`

In `PilotDamageTakenBars`, change the pilot identification line:

Old:
```ts
      const pilot = e.pilotName ?? "Unknown";
      const existing = map.get(pilot);
      map.set(pilot, {
        damage: (existing?.damage ?? 0) + (e.amount ?? 0),
        shipType: e.shipType ?? existing?.shipType ?? "",
      });
```

New:
```ts
      const pilot = e.fleetPilot ?? e.pilotName ?? "Unknown";
      const existing = map.get(pilot);
      map.set(pilot, {
        damage: (existing?.damage ?? 0) + (e.amount ?? 0),
        shipType: e.fleetShipType ?? e.shipType ?? existing?.shipType ?? "",
      });
```

### Task 1.5 — Verify Phase 1

Run TypeScript check. Fix any errors before proceeding.

---

## Phase 2 — Access control via localStorage

Fleet sessions are visible to anyone who knows the URL. Gate visibility on whether the user's browser holds the session UUID.

The localStorage key is `fleet:session-ids` — a JSON-serialised `string[]` of session UUIDs.

### Task 2.1 — Save UUID on create

**File:** `src/app/fleet/create/page.tsx`

In `handleSubmit`, after `setCreatedSession(data)` (line 57), insert:

```ts
      // Persist session UUID locally so this browser can see the fleet
      try {
        const stored = JSON.parse(localStorage.getItem("fleet:session-ids") ?? "[]") as string[];
        if (!stored.includes(data.id)) {
          localStorage.setItem("fleet:session-ids", JSON.stringify([...stored, data.id]));
        }
      } catch { /* localStorage unavailable */ }
```

### Task 2.2 — Save UUID on join

**File:** `src/app/fleet/join/page.tsx`

In `handleSubmit`, after the `if (!response.ok || !data.success)` guard and before `router.push(...)`, insert:

```ts
      // Persist session UUID locally
      try {
        const stored = JSON.parse(localStorage.getItem("fleet:session-ids") ?? "[]") as string[];
        if (!stored.includes(data.session.id)) {
          localStorage.setItem("fleet:session-ids", JSON.stringify([...stored, data.session.id]));
        }
      } catch { /* localStorage unavailable */ }
```

### Task 2.3 — Filter fleet index by localStorage UUIDs

**File:** `src/app/fleet/page.tsx`

Replace the `useEffect` fetch block (lines 27-35):

Old:
```ts
  useEffect(() => {
    fetch("/api/fleet-sessions")
      .then((r) => r.json())
      .then((data: SessionRow[]) =>
        setSessions(Array.isArray(data) ? data : []),
      )
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);
```

New:
```ts
  useEffect(() => {
    let ids: string[] = [];
    try {
      ids = JSON.parse(localStorage.getItem("fleet:session-ids") ?? "[]") as string[];
    } catch { /* ignore */ }

    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    const query = new URLSearchParams({ ids: ids.join(",") });
    fetch(`/api/fleet-sessions?${query}`)
      .then((r) => r.json())
      .then((data: SessionRow[]) =>
        setSessions(Array.isArray(data) ? data : []),
      )
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);
```

### Task 2.4 — Add `?ids=` filter to fleet-sessions API

**File:** `src/app/api/fleet-sessions/route.ts`

Replace the GET handler signature and body:

Old:
```ts
export async function GET() {
  try {
    const userSessions = listUserSessions().map((session) => ({
      ...session,
      participantCount: session.participants.length,
      logCount: session.logs.length,
    }));

    return NextResponse.json(userSessions);
```

New:
```ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawIds = searchParams.get("ids");
    const ids = rawIds ? rawIds.split(",").filter(Boolean) : [];

    const allSessions = listUserSessions();
    const filtered = ids.length > 0
      ? allSessions.filter((s) => ids.includes(s.id))
      : allSessions;

    const userSessions = filtered.map((session) => ({
      ...session,
      participantCount: session.participants.length,
      logCount: session.logs.length,
    }));

    return NextResponse.json(userSessions);
```

### Task 2.5 — Gate session detail page on localStorage

**File:** `src/app/fleet/[sessionId]/page.tsx`

After the `sessionId` variable is resolved (after line 27), add an access-check state and an early-return render. Insert before the `data` state declaration:

```ts
  const [accessDenied, setAccessDenied] = useState(false);
```

Inside `fetchSession`, before `setLoading(true)`, add:

```ts
    // Check localStorage access before fetching
    try {
      const stored = JSON.parse(localStorage.getItem("fleet:session-ids") ?? "[]") as string[];
      if (!stored.includes(id)) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
    } catch { /* localStorage unavailable — allow fetch */ }
```

After the `loading` early return (wherever it is rendered), add an access-denied render before the main content:

```tsx
  if (accessDenied) {
    return (
      <AppLayout title="FLEET SESSION">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-status-kill font-mono text-sm uppercase tracking-widest">
            Access Denied
          </p>
          <p className="text-text-muted text-sm">
            This fleet session is not associated with your browser.
          </p>
          <Link href="/fleet">
            <Button variant="secondary">Back to Fleet</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }
```

Also add a localStorage save on successful load (inside `fetchSession`, after `setData(sessionData)`):

```ts
      // Ensure UUID is persisted (e.g. if user followed a direct link after joining)
      try {
        const stored = JSON.parse(localStorage.getItem("fleet:session-ids") ?? "[]") as string[];
        if (id && !stored.includes(id)) {
          localStorage.setItem("fleet:session-ids", JSON.stringify([...stored, id]));
        }
      } catch { /* ignore */ }
```

### Task 2.6 — Verify Phase 2

Run TypeScript check. Test in browser: create fleet → UUID in localStorage → visible in fleet index. Open fleet index in fresh InPrivate tab → "No fleets yet".

---

## Phase 3 — Per-pilot Damage Taken chart

Mirror the per-pilot DPS chart from Damage Dealt, but for incoming damage.

### Task 3.1 — Add `computePerPilotDamageTaken` and chart to `FleetDamageTakenContent.tsx`

**File:** `src/components/fleet/FleetDamageTakenContent.tsx`

1. Add recharts imports at the top (after existing imports):

```ts
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
```

2. Add the color palette and compute function after the `fmtTime` helper (before `PilotDamageTakenBars`):

```ts
const PILOT_COLORS = [
  "#00d4ff", "#ff6b35", "#7cfc00", "#ff69b4",
  "#ffd700", "#9370db", "#20b2aa", "#ff4500",
];

function computePerPilotDamageTaken(
  entries: LogEntry[],
  bucketSecs = 30,
): { data: Record<string, unknown>[]; pilots: string[] } {
  const dmgEntries = entries.filter((e) => e.eventType === "damage-received");
  if (dmgEntries.length === 0) return { data: [], pilots: [] };

  const pilotsSet = new Set<string>();
  for (const e of dmgEntries) {
    const p = e.fleetPilot ?? e.pilotName;
    if (p) pilotsSet.add(p);
  }
  const pilots = Array.from(pilotsSet).sort();

  const times = dmgEntries.map((e) => e.timestamp.getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const bucketMs = bucketSecs * 1000;

  const buckets = new Map<number, Map<string, number>>();
  for (const entry of dmgEntries) {
    const pilot = entry.fleetPilot ?? entry.pilotName ?? "Unknown";
    const bucketIdx = Math.floor((entry.timestamp.getTime() - tMin) / bucketMs);
    const bucketTime = tMin + bucketIdx * bucketMs;
    if (!buckets.has(bucketTime)) buckets.set(bucketTime, new Map());
    const m = buckets.get(bucketTime)!;
    m.set(pilot, (m.get(pilot) ?? 0) + (entry.amount ?? 0));
  }

  const numBuckets = Math.ceil((tMax - tMin) / bucketMs) + 1;
  const data: Record<string, unknown>[] = [];
  for (let i = 0; i < numBuckets; i++) {
    const t = tMin + i * bucketMs;
    const point: Record<string, unknown> = {
      label: new Date(t).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    };
    const m = buckets.get(t);
    for (const pilot of pilots) {
      point[pilot] = m ? Math.round((m.get(pilot) ?? 0) / bucketSecs) : 0;
    }
    data.push(point);
  }

  return { data, pilots };
}

function FleetPilotDamageTakenChart({ entries }: { entries: LogEntry[] }) {
  const { data, pilots } = useMemo(
    () => computePerPilotDamageTaken(entries),
    [entries],
  );
  if (data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "#8899aa", fontSize: 11, fontFamily: "monospace" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#8899aa", fontSize: 11, fontFamily: "monospace" }}
          label={{ value: "DPS", angle: -90, position: "insideLeft", fill: "#8899aa", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}
          formatter={(value: unknown, name: string | undefined) => [
            `${Number(value).toLocaleString()} DPS`,
            name ?? "",
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12, fontFamily: "monospace" }} />
        {pilots.map((pilot, i) => (
          <Line
            key={pilot}
            type="monotone"
            dataKey={pilot}
            stroke={PILOT_COLORS[i % PILOT_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

3. In the main component JSX, **replace** the "INCOMING DPS OVER TIME" Panel (which uses `DpsTakenChart`) with the new per-pilot chart:

Old:
```tsx
      {/* DPS over time */}
      <Panel title="INCOMING DPS OVER TIME (10s ROLLING)">
        <DpsTakenChart
          timeSeries={damageAnalysis.dpsTimeSeries}
          fights={damageAnalysis.fights}
          repTimeSeries={repAnalysis?.incomingRepTimeSeries}
        />
      </Panel>
```

New:
```tsx
      {/* Per-pilot incoming DPS chart */}
      <Panel title="INCOMING DPS — PER PILOT (30s buckets)">
        <FleetPilotDamageTakenChart entries={filteredEntries} />
      </Panel>
```

4. Remove the `DpsTakenChart` import since it is no longer used.

---

## Phase 4 — Per-pilot Reps chart

### Task 4.1 — Add per-pilot reps chart to `FleetAnalysisTabs.tsx`

**File:** `src/components/fleet/FleetAnalysisTabs.tsx`

1. Add recharts imports at top of file:

```ts
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useMemo, useState } from "react";  // useMemo already imported — ensure it's included
```

(Note: `useMemo` and `useState` are already imported; just add the recharts imports.)

2. Add color palette and compute function before `RepsTab`:

```ts
const PILOT_COLORS = [
  "#00d4ff", "#ff6b35", "#7cfc00", "#ff69b4",
  "#ffd700", "#9370db", "#20b2aa", "#ff4500",
];

function computePerPilotReps(
  entries: LogEntry[],
  bucketSecs = 30,
): { data: Record<string, unknown>[]; pilots: string[] } {
  const repEntries = entries.filter((e) => e.eventType === "rep-received");
  if (repEntries.length === 0) return { data: [], pilots: [] };

  const pilotsSet = new Set<string>();
  for (const e of repEntries) {
    const p = e.fleetPilot ?? e.pilotName;
    if (p) pilotsSet.add(p);
  }
  const pilots = Array.from(pilotsSet).sort();

  const times = repEntries.map((e) => e.timestamp.getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const bucketMs = bucketSecs * 1000;

  const buckets = new Map<number, Map<string, number>>();
  for (const entry of repEntries) {
    const pilot = entry.fleetPilot ?? entry.pilotName ?? "Unknown";
    const bucketIdx = Math.floor((entry.timestamp.getTime() - tMin) / bucketMs);
    const bucketTime = tMin + bucketIdx * bucketMs;
    if (!buckets.has(bucketTime)) buckets.set(bucketTime, new Map());
    const m = buckets.get(bucketTime)!;
    m.set(pilot, (m.get(pilot) ?? 0) + (entry.amount ?? 0));
  }

  const numBuckets = Math.ceil((tMax - tMin) / bucketMs) + 1;
  const data: Record<string, unknown>[] = [];
  for (let i = 0; i < numBuckets; i++) {
    const t = tMin + i * bucketMs;
    const point: Record<string, unknown> = {
      label: new Date(t).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    };
    const m = buckets.get(t);
    for (const pilot of pilots) {
      point[pilot] = m ? Math.round((m.get(pilot) ?? 0) / bucketSecs) : 0;
    }
    data.push(point);
  }

  return { data, pilots };
}
```

3. Update `RepsTab` to accept `entries` and render the chart above the bars:

Change signature:
```ts
function RepsTab({
  participants,
  totalGiven,
  entries,
}: {
  participants: FleetParticipant[];
  totalGiven: number;
  entries: LogEntry[];
}) {
```

Add chart render at the top of the return (before the `sorted.length === 0` early return or inside the main return, whichever is cleaner):

```tsx
  const { data: repsChartData, pilots: repsPilots } = useMemo(
    () => computePerPilotReps(entries),
    [entries],
  );

  return (
    <div className="space-y-4">
      {repsChartData.length > 0 && (
        <div className="bg-bg-secondary border border-border rounded p-4">
          <p className="text-xs font-mono text-text-muted uppercase tracking-widest mb-3">
            Reps Received — Per Pilot (30s buckets)
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={repsChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: "#8899aa", fontSize: 11, fontFamily: "monospace" }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#8899aa", fontSize: 11, fontFamily: "monospace" }} label={{ value: "HP/s", angle: -90, position: "insideLeft", fill: "#8899aa", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}
                formatter={(value: unknown, name: string | undefined) => [`${Number(value).toLocaleString()} HP/s`, name ?? ""]}
              />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: "monospace" }} />
              {repsPilots.map((pilot, i) => (
                <Line key={pilot} type="monotone" dataKey={pilot} stroke={PILOT_COLORS[i % PILOT_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      {sorted.length === 0 ? (
        <p className="text-text-muted text-center py-12">No remote repair events recorded. Upload combat logs with rep activity to populate this view.</p>
      ) : (
        <div className="space-y-2">
          {/* existing bar render */}
        </div>
      )}
    </div>
  );
```

(Keep existing bar rendering logic unchanged; only wrap it and prepend the chart.)

4. Pass `entries` to `RepsTab` in the main component:

```tsx
        {activeTab === "reps" && (
          <RepsTab
            participants={fleetCombatAnalysis.participants}
            totalGiven={fleetCombatAnalysis.totalRepsGiven}
            entries={entries}
          />
        )}
```

---

## Phase 5 — Drill-down cross-matrix

### Task 5.1 — Add `DamageDealtMatrix` to `FleetDamageDealtContent.tsx`

**File:** `src/components/fleet/FleetDamageDealtContent.tsx`

Add these helpers and the `DamageDealtMatrix` component before the main `FleetDamageDealtContent` export.

#### Data types and build logic

```ts
interface CrossEntry {
  totalDamage: number;
  entries: LogEntry[];
}

function buildDamageDealtMatrix(entries: LogEntry[]) {
  const byPilot = new Map<string, Map<string, CrossEntry>>();
  const byTarget = new Map<string, Map<string, CrossEntry>>();

  for (const e of entries) {
    if (e.eventType !== "damage-dealt") continue;
    const pilot = e.fleetPilot ?? e.pilotName ?? "Unknown";
    const target = e.pilotName ?? e.shipType ?? "Unknown";
    // After data model fix: fleetPilot is set, so pilotName is the real target name.
    // Guard: if fleetPilot is not set (legacy entries), skip target cross-ref.
    const targetKey = e.fleetPilot ? target : `[${e.shipType ?? "Unknown"}]`;

    // byPilot
    if (!byPilot.has(pilot)) byPilot.set(pilot, new Map());
    const pm = byPilot.get(pilot)!;
    const pe = pm.get(targetKey) ?? { totalDamage: 0, entries: [] };
    pe.totalDamage += e.amount ?? 0;
    pe.entries.push(e);
    pm.set(targetKey, pe);

    // byTarget
    if (!byTarget.has(targetKey)) byTarget.set(targetKey, new Map());
    const tm = byTarget.get(targetKey)!;
    const te = tm.get(pilot) ?? { totalDamage: 0, entries: [] };
    te.totalDamage += e.amount ?? 0;
    te.entries.push(e);
    tm.set(pilot, te);
  }

  // Aggregate pilot totals
  const pilots = Array.from(byPilot.entries())
    .map(([name, targets]) => ({
      name,
      totalDamage: Array.from(targets.values()).reduce((s, v) => s + v.totalDamage, 0),
    }))
    .sort((a, b) => b.totalDamage - a.totalDamage);

  // Aggregate target totals
  const targets = Array.from(byTarget.entries())
    .map(([name, pilots]) => ({
      name,
      totalDamage: Array.from(pilots.values()).reduce((s, v) => s + v.totalDamage, 0),
    }))
    .sort((a, b) => b.totalDamage - a.totalDamage);

  return { byPilot, byTarget, pilots, targets };
}
```

#### DamageDealtMatrix component

```tsx
function DamageDealtMatrix({ entries }: { entries: LogEntry[] }) {
  const [selectedPilot, setSelectedPilot] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const matrix = useMemo(() => buildDamageDealtMatrix(entries), [entries]);

  const grandTotal = useMemo(
    () => matrix.pilots.reduce((s, p) => s + p.totalDamage, 0),
    [matrix],
  );

  // Right-panel targets: filtered by selected pilot, or all
  const rightTargets = useMemo(() => {
    if (selectedPilot) {
      const pilotMap = matrix.byPilot.get(selectedPilot);
      if (!pilotMap) return [];
      return Array.from(pilotMap.entries())
        .map(([name, { totalDamage }]) => ({ name, totalDamage }))
        .sort((a, b) => b.totalDamage - a.totalDamage);
    }
    if (selectedTarget) {
      // Show only pilots who hit the selected target
      const targetMap = matrix.byTarget.get(selectedTarget);
      if (!targetMap) return [{ name: selectedTarget, totalDamage: 0 }];
      return [{ name: selectedTarget, totalDamage: matrix.targets.find((t) => t.name === selectedTarget)?.totalDamage ?? 0 }];
    }
    return matrix.targets;
  }, [matrix, selectedPilot, selectedTarget]);

  // Left-panel pilots: filtered by selected target, or all
  const leftPilots = useMemo(() => {
    if (selectedTarget) {
      const targetMap = matrix.byTarget.get(selectedTarget);
      if (!targetMap) return [];
      return Array.from(targetMap.entries())
        .map(([name, { totalDamage }]) => ({ name, totalDamage }))
        .sort((a, b) => b.totalDamage - a.totalDamage);
    }
    return matrix.pilots;
  }, [matrix, selectedTarget]);

  // Chart entries: filtered by selection
  const chartEntries = useMemo(() => {
    let filtered = entries.filter((e) => e.eventType === "damage-dealt");
    if (selectedPilot)
      filtered = filtered.filter((e) => (e.fleetPilot ?? e.pilotName) === selectedPilot);
    if (selectedTarget)
      filtered = filtered.filter(
        (e) => (e.pilotName ?? e.shipType ?? "Unknown") === selectedTarget,
      );
    return filtered;
  }, [entries, selectedPilot, selectedTarget]);

  const rightTotal = useMemo(
    () => rightTargets.reduce((s, t) => s + t.totalDamage, 0),
    [rightTargets],
  );

  if (matrix.pilots.length === 0) return null;

  const handlePilotClick = (name: string) => {
    setSelectedTarget(null);
    setSelectedPilot((prev) => (prev === name ? null : name));
  };

  const handleTargetClick = (name: string) => {
    setSelectedPilot(null);
    setSelectedTarget((prev) => (prev === name ? null : name));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Left: fleet pilots */}
        <div className="space-y-1">
          <p className="text-xs font-mono text-text-muted uppercase tracking-widest mb-2">
            Fleet Pilot
          </p>
          {leftPilots.map(({ name, totalDamage }) => {
            const pct = grandTotal > 0 ? (totalDamage / grandTotal) * 100 : 0;
            const active = selectedPilot === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => handlePilotClick(name)}
                className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                  active
                    ? "border-cyan-glow bg-cyan-glow/10 text-cyan-glow"
                    : "border-border bg-bg-secondary hover:border-border-hover text-text-primary"
                }`}
              >
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>{name}</span>
                  <span className={active ? "text-cyan-glow" : "text-text-secondary"}>
                    {fmt(totalDamage)}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-bg-primary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${active ? "bg-cyan-glow" : "bg-border"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
          {selectedTarget && (
            <p className="text-xs text-text-muted font-mono pt-1">
              Showing pilots who hit <span className="text-cyan-glow">{selectedTarget}</span>
            </p>
          )}
        </div>

        {/* Right: targets */}
        <div className="space-y-1">
          <p className="text-xs font-mono text-text-muted uppercase tracking-widest mb-2">
            Target
          </p>
          {rightTargets.map(({ name, totalDamage }) => {
            const pct = rightTotal > 0 ? (totalDamage / rightTotal) * 100 : 0;
            const active = selectedTarget === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => handleTargetClick(name)}
                className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                  active
                    ? "border-gold-bright bg-gold-bright/10 text-gold-bright"
                    : "border-border bg-bg-secondary hover:border-border-hover text-text-primary"
                }`}
              >
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>{name}</span>
                  <span className={active ? "text-gold-bright" : "text-text-secondary"}>
                    {fmt(totalDamage)}{" "}
                    <span className="text-text-muted">({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="h-1 rounded-full bg-bg-primary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${active ? "bg-gold-bright" : "bg-border"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
          {selectedPilot && (
            <p className="text-xs text-text-muted font-mono pt-1">
              Targets hit by <span className="text-cyan-glow">{selectedPilot}</span>
            </p>
          )}
        </div>
      </div>

      {/* Filtered DPS chart */}
      {chartEntries.length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-mono text-text-muted uppercase tracking-widest mb-3">
            {selectedPilot && selectedTarget
              ? `${selectedPilot} → ${selectedTarget}`
              : selectedPilot
              ? `${selectedPilot} — all targets`
              : selectedTarget
              ? `All pilots → ${selectedTarget}`
              : "All fleet damage — per pilot"}
          </p>
          <FleetPilotDpsChart entries={chartEntries} />
        </div>
      )}
    </div>
  );
}
```

#### Wire into main component

In `FleetDamageDealtContent`, **replace** the "DPS PER TARGET" Panel with `DamageDealtMatrix`:

Old:
```tsx
      {/* DPS per target */}
      <Panel title="DPS PER TARGET">
        <DataTable
          columns={engagementColumns}
          data={engagementRows as unknown as Record<string, unknown>[]}
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
```

New:
```tsx
      {/* Drill-down: fleet pilot ↔ target */}
      <Panel title="DAMAGE MATRIX — FLEET PILOTS vs TARGETS">
        <DamageDealtMatrix entries={entries} />
      </Panel>
```

Remove the now-unused `zoomedTarget`, `handleTargetClick`, `engagementRows`, `engagementColumns`, `EngagementRow`, and `buildEngagementColumns` declarations. Remove the `analyzeDamageDealt` call and its `engagements`/`maxDps` derivations if the stat cards can be computed directly from entries instead — OR keep `analyzeDamageDealt` only for the stat cards.

**Keep:** stat cards (bestHit, worstHit, avgHit, totalHits, totalDamageDealt) — these still use `analysis` from `analyzeDamageDealt`.
**Remove:** `zoomedTarget` state, `handleTargetClick`, `engagementRows`, `engagementColumns`, `buildEngagementColumns` function, `EngagementRow` type.

### Task 5.2 — Add `DamageTakenMatrix` to `FleetDamageTakenContent.tsx`

**File:** `src/components/fleet/FleetDamageTakenContent.tsx`

Add the following component after `PilotDamageTakenBars` (keep that component too; `DamageTakenMatrix` replaces the panel in JSX but uses the same pattern):

```ts
function buildDamageTakenMatrix(entries: LogEntry[]) {
  const byPilot = new Map<string, Map<string, CrossEntry>>();
  const byAttacker = new Map<string, Map<string, CrossEntry>>();

  for (const e of entries) {
    if (e.eventType !== "damage-received") continue;
    const pilot = e.fleetPilot ?? e.pilotName ?? "Unknown";
    const attacker = e.fleetPilot
      ? (e.pilotName ?? e.shipType ?? "Unknown")
      : `[${e.shipType ?? "Unknown"}]`;

    if (!byPilot.has(pilot)) byPilot.set(pilot, new Map());
    const pm = byPilot.get(pilot)!;
    const pe = pm.get(attacker) ?? { totalDamage: 0, entries: [] };
    pe.totalDamage += e.amount ?? 0;
    pe.entries.push(e);
    pm.set(attacker, pe);

    if (!byAttacker.has(attacker)) byAttacker.set(attacker, new Map());
    const am = byAttacker.get(attacker)!;
    const ae = am.get(pilot) ?? { totalDamage: 0, entries: [] };
    ae.totalDamage += e.amount ?? 0;
    ae.entries.push(e);
    am.set(pilot, ae);
  }

  const pilots = Array.from(byPilot.entries())
    .map(([name, attackers]) => ({
      name,
      totalDamage: Array.from(attackers.values()).reduce((s, v) => s + v.totalDamage, 0),
    }))
    .sort((a, b) => b.totalDamage - a.totalDamage);

  const attackers = Array.from(byAttacker.entries())
    .map(([name, pilotMap]) => ({
      name,
      totalDamage: Array.from(pilotMap.values()).reduce((s, v) => s + v.totalDamage, 0),
    }))
    .sort((a, b) => b.totalDamage - a.totalDamage);

  return { byPilot, byAttacker, pilots, attackers };
}
```

Then add `DamageTakenMatrix` component (same structure as `DamageDealtMatrix` but left = fleet pilots damaged, right = attackers; use orange/red color scheme for highlight: left active = `border-orange-500 bg-orange-500/10 text-orange-400`, right active = `border-status-kill bg-status-kill/10 text-status-kill`; chart calls `computePerPilotDamageTaken(chartEntries)`).

**Wire into main component:**

Replace:
```tsx
      {/* Per-pilot damage taken bars */}
      <Panel title="DAMAGE TAKEN — PER PILOT">
        <PilotDamageTakenBars entries={filteredEntries} />
      </Panel>
```

With:
```tsx
      {/* Drill-down: fleet pilot ↔ attacker */}
      <Panel title="DAMAGE MATRIX — FLEET PILOTS vs ATTACKERS">
        <DamageTakenMatrix entries={filteredEntries} />
      </Panel>
```

Add the required `CrossEntry` type and `computePerPilotDamageTaken` is already added in Phase 3, so `DamageTakenMatrix`'s chart can call it directly.

---

## Phase 6 — Final verification

1. Run TypeScript check: `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH" && node node_modules/.bin/tsc --noEmit`
2. Fix any type errors.
3. Confirm the following TypeScript import removals where applicable:
   - `DpsTakenChart` import removed from `FleetDamageTakenContent.tsx` (replaced by new chart)
   - `TargetEngagement` import in `FleetDamageDealtContent.tsx` can be removed if engagement table is fully replaced

---

## Summary of files changed

| File | Phase | Change |
|---|---|---|
| `src/lib/types.ts` | 1 | Add `fleetPilot?`, `fleetShipType?` to `LogEntry` |
| `src/lib/fleet/logMerging.ts` | 1 | Use new fields; stop overwriting `pilotName`/`shipType` |
| `src/components/fleet/FleetDamageDealtContent.tsx` | 1,5 | Update pilot refs; replace engagement table with `DamageDealtMatrix` |
| `src/components/fleet/FleetDamageTakenContent.tsx` | 1,3,5 | Update pilot refs; per-pilot DPS chart; `DamageTakenMatrix` |
| `src/components/fleet/FleetAnalysisTabs.tsx` | 4 | Per-pilot reps chart in `RepsTab` |
| `src/app/fleet/create/page.tsx` | 2 | Save UUID to localStorage after creation |
| `src/app/fleet/join/page.tsx` | 2 | Save UUID to localStorage after join |
| `src/app/fleet/page.tsx` | 2 | Filter fetch by localStorage UUIDs |
| `src/app/api/fleet-sessions/route.ts` | 2 | Add `?ids=` query param filter |
| `src/app/fleet/[sessionId]/page.tsx` | 2 | localStorage access gate + Access Denied render |
