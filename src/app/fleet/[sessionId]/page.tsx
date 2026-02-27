"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import Button from "@/components/ui/Button";
import DataTable, { Column } from "@/components/ui/DataTable";
import LogUploadForm from "@/components/fleet/LogUploadForm";
import LogRenameInline from "@/components/logs/LogRenameInline";
import FleetAnalysisTabs from "@/components/fleet/FleetAnalysisTabs";
import type { FleetSession, FleetParticipant, FleetLog } from "@/types/fleet";
import type { LogEntry } from "@/lib/types";

interface SessionData {
  session: FleetSession;
  participants: FleetParticipant[];
  logs: FleetLog[];
  analysisReady: boolean;
  mergedEntries?: LogEntry[];
}

export default function FleetSessionDetailPage() {
  const params = useParams();
  const rawSessionId = (params as { sessionId?: string | string[] })?.sessionId;
  const sessionId = Array.isArray(rawSessionId)
    ? rawSessionId[0]
    : rawSessionId;
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSession = async (id: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      // Check localStorage for access
      try {
        const stored = JSON.parse(
          localStorage.getItem("fleet:session-ids") ?? "[]",
        ) as string[];
        if (!stored.includes(id)) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      } catch {
        // ignore localStorage errors and continue to fetch
      }
      const response = await fetch(`/api/fleet-sessions/${id}`);
      if (!response.ok) {
        throw new Error("Session not found");
      }
      const sessionData = await response.json();
      // Revive timestamp strings → Date objects on merged entries
      if (Array.isArray(sessionData.mergedEntries)) {
        sessionData.mergedEntries = sessionData.mergedEntries.map(
          (entry: LogEntry & { timestamp: string }) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
          }),
        );
      }
      setData(sessionData);
      setAccessDenied(false);
      // Persist the id locally so this browser can access it in future
      try {
        const stored = JSON.parse(
          localStorage.getItem("fleet:session-ids") ?? "[]",
        ) as string[];
        if (!stored.includes(id)) {
          localStorage.setItem(
            "fleet:session-ids",
            JSON.stringify([...stored, id]),
          );
        }
      } catch {
        /* ignore */
      }
    } catch (err) {
      if (!silent)
        setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionId) return;
    fetchSession(sessionId);
  }, [sessionId]);

  // Live-refresh: subscribe to SSE updates so we hot-reload when a fleet
  // member uploads a new log without requiring a manual page refresh.
  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/fleet-sessions/${sessionId}/events`);

    es.onmessage = (event: MessageEvent) => {
      const payload = JSON.parse(event.data as string) as { type: string };
      if (payload.type === "log-uploaded") {
        setRefreshing(true);
        void fetchSession(sessionId, true).finally(() => setRefreshing(false));
      }
    };

    return () => {
      es.close();
    };
  }, [sessionId]);

  const handleCopyCode = async () => {
    if (data?.session.code) {
      setCopyError(null);
      setCopied(false);
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(data.session.code);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
          return;
        }

        const textarea = document.createElement("textarea");
        textarea.value = data.session.code;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!success) {
          throw new Error("Copy failed");
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
        setCopyError("Copy failed. Please select and copy manually.");
      }
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    if (sessionId) {
      fetchSession(sessionId); // Refresh data
    }
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

  if (accessDenied) {
    return (
      <AppLayout title="FLEET SESSION">
        <div className="space-y-6">
          <h1 className="text-2xl font-ui uppercase tracking-wider text-text-primary">
            Access Denied
          </h1>
          <p className="text-text-muted">
            You do not have access to view this session from this browser.
          </p>
          <Link href="/fleet">
            <Button>Back to Fleet Sessions</Button>
          </Link>
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
  const sessionWithParticipants = { ...session, participants };

  const participantColumns: Column<FleetParticipant>[] = [
    {
      key: "pilotName",
      label: "Pilot",
      render: (value) => <span>{value as string}</span>,
    },
    {
      key: "shipType",
      label: "Ship",
      render: (value) => <span>{(value as string) || "Unknown"}</span>,
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
            {statusMap[value as string as keyof typeof statusMap] ||
              (value as string)}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: () => (
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
      render: (value) => <span>{value as string}</span>,
    },
    {
      key: "displayName",
      label: "Display",
      render: (_, row) => (
        <LogRenameInline
          value={(row.displayName as string) ?? (row as any).fileName}
          onRename={async (newName: string) => {
            try {
              const res = await fetch(
                `/api/fleet-sessions/${session.id}/logs/${row.id}`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ displayName: newName }),
                },
              );
              if (!res.ok) return false;
              // Refresh session data so UI reflects update
              await fetchSession(session.id, true);
              return true;
            } catch {
              return false;
            }
          }}
        />
      ),
    },
    {
      key: "uploadedAt",
      label: "Uploaded",
      render: (value) =>
        new Date(value as string | number | Date).toLocaleString(),
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-ui uppercase tracking-wider text-text-primary">
                {session.fightName || "Unnamed Fight"}
              </h1>
              {refreshing && (
                <span className="text-xs text-text-muted animate-pulse uppercase tracking-wider">
                  Syncing…
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-lg">{session.code}</span>
              <Button size="sm" onClick={handleCopyCode}>
                {copied ? "Copied" : "Copy Code"}
              </Button>
            </div>
          </div>
          <p className="text-text-muted mb-2">
            Share this code with your fleet members to join the session.
          </p>
          {copied && (
            <p className="text-sm text-green-400 mb-2">Code copied.</p>
          )}
          {copyError && (
            <p className="text-sm text-red-400 mb-2">{copyError}</p>
          )}
          <div className="text-sm text-text-muted">
            Created: {new Date(session.createdAt).toLocaleString()}
            {logs.length > 0 && (
              <span className="ml-4">
                Duration: {Math.round(logs.length * 30)} minutes (estimated)
              </span>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="text-center py-6">
            <p className="text-base text-text-secondary">
              Upload logs at any time to update fleet analysis
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded p-4">
            <LogUploadForm
              sessionId={session.id}
              onSuccess={handleUploadSuccess}
            />
          </div>
        </div>

        <FleetAnalysisTabs
          sessionData={sessionWithParticipants}
          analysisReady={analysisReady}
          entries={data.mergedEntries ?? []}
        />

        {/* Participants Section */}
        <div>
          <h2 className="text-lg font-ui uppercase tracking-wider text-text-primary mb-3">
            Participants ({participants.length})
          </h2>
          <DataTable
            columns={
              participantColumns as unknown as Column<Record<string, unknown>>[]
            }
            data={participants as unknown as Record<string, unknown>[]}
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
            columns={logColumns as unknown as Column<Record<string, unknown>>[]}
            data={logs as unknown as Record<string, unknown>[]}
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
