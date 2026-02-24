"use client";

import Link from "next/link";
import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Button from "@/components/ui/Button";
import DataTable, { Column } from "@/components/ui/DataTable";
import {
  useFleetSessions,
  useFleetSessionDispatch,
} from "@/contexts/FleetContext";
import type { FleetSession } from "@/types/fleet";

export const dynamic = "force-dynamic";

export default function FleetIndexPage() {
  const sessions = useFleetSessions();
  const dispatch = useFleetSessionDispatch();
  const [collapsed, setCollapsed] = useState(true);

  const activeSessions = sessions.filter(
    (s) => s.status !== "COMPLETED" && s.status !== "ARCHIVED",
  );
  const archivedSessions = sessions.filter(
    (s) => s.status === "COMPLETED" || s.status === "ARCHIVED",
  );

  const handleDelete = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/fleet-sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        dispatch({ type: "DELETE_SESSION", payload: sessionId });
      } else {
        // TODO: Show error message
        console.error("Failed to delete session");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const columns: Column<FleetSession>[] = [
    {
      key: "code",
      label: "Session Code",
      render: (value) => <span className="font-mono">{value as string}</span>,
    },
    {
      key: "fightName",
      label: "Fight Name",
      render: (value) => (value as string) || "Unnamed Fight",
    },
    {
      key: "participants",
      label: "Participants",
      render: (_, row) => row.participants.length,
      numeric: true,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <span className="uppercase text-xs">{value as string}</span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <Link href={`/fleet/${row.id}`}>
            <Button size="sm" variant="secondary">
              View
            </Button>
          </Link>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="FLEET MANAGEMENT">
      <div className="space-y-6">
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

        <div>
          <h2 className="text-lg font-ui uppercase tracking-wider text-text-primary mb-3">
            Active Sessions
          </h2>
          <DataTable
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            data={activeSessions as unknown as Record<string, unknown>[]}
            searchable
            emptyState={
              <span className="text-text-muted">No active sessions</span>
            }
          />
        </div>

        {archivedSessions.length > 0 && (
          <div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-lg font-ui uppercase tracking-wider text-text-primary mb-3 flex items-center gap-2"
            >
              <span>{collapsed ? "+" : "-"}</span>
              Completed/Archived Sessions ({archivedSessions.length})
            </button>
            {!collapsed && (
              <DataTable
                columns={
                  columns as unknown as Column<Record<string, unknown>>[]
                }
                data={archivedSessions as unknown as Record<string, unknown>[]}
                searchable={false}
                emptyState={
                  <span className="text-text-muted">No archived sessions</span>
                }
              />
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
