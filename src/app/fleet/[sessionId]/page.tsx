"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import Button from "@/components/ui/Button";
import DataTable, { Column } from "@/components/ui/DataTable";
import LogUploadForm from "@/components/fleet/LogUploadForm";
import type { FleetSession, FleetParticipant, FleetLog } from "@/types/fleet";

interface SessionData {
  session: FleetSession;
  participants: FleetParticipant[];
  logs: FleetLog[];
  analysisReady: boolean;
}

export default function FleetSessionDetailPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/fleet-sessions/${params.sessionId}`);
      if (!response.ok) {
        throw new Error("Session not found");
      }
      const sessionData = await response.json();
      setData(sessionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [params.sessionId]);

  const handleCopyCode = async () => {
    if (data?.session.code) {
      try {
        await navigator.clipboard.writeText(data.session.code);
        // TODO: Show success message
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    fetchSession(); // Refresh data
  };

  if (loading) {
    return (
      <AppLayout title="FLEET SESSION">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-bg-secondary rounded mb-4"></div>
            <div className="h-32 bg-bg-secondary rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout title="FLEET SESSION">
        <div className="space-y-6">
          <h1 className="text-2xl font-ui uppercase tracking-wider text-text-primary">
            Session Not Found
          </h1>
          <p className="text-text-muted">{error}</p>
          <Link href="/fleet">
            <Button>Back to Fleet Sessions</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const { session, participants, logs, analysisReady } = data;

  const participantColumns: Column<FleetParticipant>[] = [
    {
      key: "pilotName",
      label: "Pilot",
      render: (value) => <span>{value}</span>,
    },
    {
      key: "shipType",
      label: "Ship",
      render: (value) => <span>{value || "Unknown"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => {
        const statusMap = {
          pending: "Pending",
          ready: "Ready",
          active: "Analyzing",
          inactive: "Inactive",
        };
        return (
          <span className="uppercase text-xs">
            {statusMap[value as keyof typeof statusMap] || value}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-2">
          {/* TODO: Add actions like remove participant */}
        </div>
      ),
    },
  ];

  const logColumns: Column<FleetLog>[] = [
    {
      key: "pilotName",
      label: "Pilot",
      render: (value) => <span>{value}</span>,
    },
    {
      key: "uploadedAt",
      label: "Uploaded",
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: "fileSize",
      label: "Size",
      render: (_, row) => {
        // Approximate size from logData length
        const size = new Blob([row.logData]).size;
        return `${(size / 1024).toFixed(1)} KB`;
      },
    },
  ];

  return (
    <AppLayout title="FLEET SESSION">
      <div className="space-y-6">
        {/* Session Header */}
        <div className="bg-bg-secondary border border-border rounded p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-ui uppercase tracking-wider text-text-primary">
              {session.fightName || "Unnamed Fight"}
            </h1>
            <div className="flex items-center gap-4">
              <span className="font-mono text-lg">{session.code}</span>
              <Button size="sm" onClick={handleCopyCode}>
                Copy Code
              </Button>
            </div>
          </div>
          <p className="text-text-muted mb-2">
            Share this code with your fleet members to join the session.
          </p>
          <div className="text-sm text-text-muted">
            Created: {new Date(session.createdAt).toLocaleString()}
            {logs.length > 0 && (
              <span className="ml-4">
                Duration: {Math.round(logs.length * 30)} minutes (estimated)
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button className="px-4 py-2 text-text-primary border-b-2 border-accent">
            Overview
          </button>
          {analysisReady && (
            <>
              <Link href="/damage-dealt">
                <button className="px-4 py-2 text-text-muted hover:text-text-primary">
                  Damage Dealt
                </button>
              </Link>
              <Link href="/kills">
                <button className="px-4 py-2 text-text-muted hover:text-text-primary">
                  Kills
                </button>
              </Link>
              <Link href="/damage-taken">
                <button className="px-4 py-2 text-text-muted hover:text-text-primary">
                  Damage Taken
                </button>
              </Link>
              <Link href="/cap-pressure">
                <button className="px-4 py-2 text-text-muted hover:text-text-primary">
                  Cap Pressure
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Participants Section */}
        <div>
          <h2 className="text-lg font-ui uppercase tracking-wider text-text-primary mb-3">
            Participants ({participants.length})
          </h2>
          <DataTable
            columns={participantColumns}
            data={participants}
            searchable={false}
            emptyState={
              <span className="text-text-muted">No participants yet</span>
            }
          />
        </div>

        {/* Log Management Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-ui uppercase tracking-wider text-text-primary">
              Combat Logs ({logs.length})
            </h2>
            <Button onClick={() => setShowUploadForm(!showUploadForm)}>
              {showUploadForm ? "Cancel Upload" : "Upload New Log"}
            </Button>
          </div>

          {showUploadForm && (
            <div className="bg-bg-secondary border border-border rounded p-4 mb-4">
              <LogUploadForm
                sessionId={session.id}
                onSuccess={handleUploadSuccess}
              />
            </div>
          )}

          <DataTable
            columns={logColumns}
            data={logs}
            searchable={false}
            emptyState={
              <span className="text-text-muted">No logs uploaded yet</span>
            }
          />
        </div>
      </div>
    </AppLayout>
  );
}
