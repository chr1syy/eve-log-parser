"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import Button from "@/components/ui/Button";
import DataTable, { Column } from "@/components/ui/DataTable";

export const dynamic = "force-dynamic";

interface SessionRow {
  id: string;
  code: string;
  fightName?: string;
  status: string;
  participantCount: number;
  logCount: number;
  createdAt: string;
}

export default function FleetIndexPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let ids: string[] = [];
    try {
      ids = JSON.parse(
        localStorage.getItem("fleet:session-ids") ?? "[]",
      ) as string[];
    } catch {
      /* ignore */
    }

    if (ids.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleDelete = async (id: string) => {
    await fetch(`/api/fleet-sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "code",
      label: "Fleet ID",
      sortable: true,
      render: (v, row) => {
        const r = row as unknown as SessionRow;
        return (
          <Link href={`/fleet/${r.id}`}>
            <span className="font-mono text-cyan-glow hover:underline cursor-pointer">
              {String(v)}
            </span>
          </Link>
        );
      },
    },
    {
      key: "fightName",
      label: "Name",
      sortable: true,
      render: (v) =>
        v ? (
          <span className="text-text-primary">{String(v)}</span>
        ) : (
          <span className="text-text-muted italic">Unnamed</span>
        ),
    },
    {
      key: "id",
      label: "UUID",
      render: (v) => (
        <span className="font-mono text-xs text-text-muted">{String(v)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (v) => (
        <span className="uppercase text-xs font-mono text-text-secondary">
          {String(v)}
        </span>
      ),
    },
    {
      key: "participantCount",
      label: "Pilots",
      sortable: true,
      numeric: true,
      render: (v) => <span className="font-mono text-xs">{String(v)}</span>,
    },
    {
      key: "logCount",
      label: "Logs",
      sortable: true,
      numeric: true,
      render: (v) => <span className="font-mono text-xs">{String(v)}</span>,
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (v) => (
        <span className="font-mono text-xs text-text-secondary">
          {new Date(String(v)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (_, row) => {
        const r = row as unknown as SessionRow;
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push(`/fleet/${r.id}`)}
            >
              View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleDelete(r.id)}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <AppLayout title="FLEET MANAGEMENT">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-ui uppercase tracking-wider text-text-primary">
            Fleet Session Management
          </h1>
          <div className="flex gap-4">
            <Link href="/fleet/create">
              <Button>Create New Fleet Session</Button>
            </Link>
            <Link href="/fleet/join">
              <Button variant="secondary">Join Existing Session</Button>
            </Link>
          </div>
        </div>
        <p className="text-text-muted text-sm">
          Fleet sessions are private. Only pilots with the session code can join.
        </p>

        {loading ? (
          <div className="animate-pulse h-32 bg-bg-secondary rounded" />
        ) : (
          <DataTable
            columns={columns}
            data={sessions as unknown as Record<string, unknown>[]}
            searchable
            searchPlaceholder="SEARCH SESSIONS..."
            rowKey={(row) => String((row as unknown as SessionRow).id)}
            defaultSortKey="createdAt"
            defaultSortDirection="desc"
            emptyState={
              <div className="text-center py-12">
                <p className="text-text-muted font-mono text-sm uppercase tracking-widest">
                  No fleets yet
                </p>
                <p className="text-text-muted text-xs mt-2">
                  Create or join a fleet session to get started.
                </p>
              </div>
            }
          />
        )}
      </div>
    </AppLayout>
  );
}
