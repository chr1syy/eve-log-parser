"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { History, AlertCircle } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import Panel from "@/components/ui/Panel";
import LogHistoryItem from "@/components/LogHistoryItem";
import { useLogsContext } from "@/contexts/LogsContext";
import { useAuth } from "@/contexts/AuthContext";
import type { ParsedLog } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LogHistoryEntry {
  id: string;
  filename: string;
  uploadedAt: Date;
  fileSize?: number;
  combatDuration?: number;
  parsedLog: ParsedLog;
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { selectLog, deleteLog } = useLogsContext();
  const [logs, setLogs] = useState<LogHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router]);

  // Load user logs on mount
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/logs");
        if (!res.ok) {
          throw new Error(`Failed to fetch logs: ${res.statusText}`);
        }

        const data = (await res.json()) as { logs: ParsedLog[] };
        const logsWithMetadata: LogHistoryEntry[] = (data.logs || []).map(
          (log) => ({
            id: log.sessionId,
            filename: log.displayName ?? log.fileName,
            uploadedAt: new Date(log.parsedAt as unknown as string),
            fileSize: undefined,
            combatDuration: log.stats?.activeTimeMinutes,
            parsedLog: log,
          }),
        );

        // Sort by upload date (newest first)
        logsWithMetadata.sort(
          (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime(),
        );

        setLogs(logsWithMetadata);
      } catch (err) {
        console.error("Error loading user logs:", err);
        setError("Failed to load your logs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [isAuthenticated, authLoading]);

  const handleViewLog = useCallback(
    async (logId: string) => {
      try {
        setSelectedLogId(logId);
        await selectLog(logId);
        // Navigate to dashboard after selecting
        router.push("/");
      } catch (err) {
        console.error("Error selecting log:", err);
        setError("Failed to load log. Please try again.");
        setSelectedLogId(null);
      }
    },
    [selectLog, router],
  );

  const handleDeleteLog = useCallback(
    async (logId: string) => {
      try {
        await deleteLog(logId);
        setLogs((prevLogs) => prevLogs.filter((log) => log.id !== logId));
        setSelectedLogId(null);
      } catch (err) {
        console.error("Error deleting log:", err);
        setError("Failed to delete log. Please try again.");
      }
    },
    [deleteLog],
  );

  if (authLoading) {
    return (
      <AppLayout title="Log History">
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-cyan-glow border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-secondary">Loading authentication...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <AppLayout title="Log History">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <History className="w-6 h-6 text-cyan-glow" />
          <h1 className="text-2xl font-bold text-text-primary uppercase tracking-wider">
            Combat Log History
          </h1>
        </div>

        {/* Error message */}
        {error && (
          <Panel className="border-red-500/30 bg-red-500/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-300 hover:text-red-200 mt-2 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </Panel>
        )}

        {/* Main content */}
        <Panel>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-2 border-cyan-glow border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-text-secondary">Loading your logs...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <History className="w-12 h-12 text-text-muted mb-4 opacity-50" />
              <p className="text-text-secondary text-center">No logs yet</p>
              <p className="text-text-muted text-sm mt-2">
                Upload your first combat log to get started
              </p>
              <button
                onClick={() => router.push("/upload")}
                className={cn(
                  "mt-6 px-4 py-2 text-sm font-ui rounded",
                  "border border-cyan-glow text-cyan-glow",
                  "hover:bg-cyan-ghost transition-all duration-150",
                )}
              >
                Upload Log
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Column headers */}
              <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2 text-xs text-text-muted font-mono uppercase tracking-wider border-b border-border">
                <div className="col-span-5">Filename</div>
                <div className="col-span-7 text-right">Actions</div>
              </div>

              {/* Log rows */}
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {logs.map((logEntry) => (
                  <LogHistoryItem
                    key={logEntry.id}
                    id={logEntry.id}
                    filename={logEntry.filename}
                    uploadedAt={logEntry.uploadedAt}
                    fileSize={logEntry.fileSize}
                    combatDuration={logEntry.combatDuration}
                    isSelected={selectedLogId === logEntry.id}
                    onView={handleViewLog}
                    onDelete={handleDeleteLog}
                  />
                ))}
              </div>

              {/* Stats footer */}
              <div className="mt-6 pt-4 border-t border-border text-sm text-text-muted">
                <p>
                  Total logs:{" "}
                  <span className="text-cyan-glow font-mono">
                    {logs.length}
                  </span>
                </p>
                <p className="mt-1">
                  Total combat time:{" "}
                  <span className="text-cyan-glow font-mono">
                    {(() => {
                      const totalMinutes = logs.reduce(
                        (sum, log) => sum + (log.combatDuration || 0),
                        0,
                      );
                      if (totalMinutes < 60)
                        return `${Math.round(totalMinutes)}m`;
                      const h = Math.floor(totalMinutes / 60);
                      const m = Math.round(totalMinutes % 60);
                      return m > 0 ? `${h}h ${m}m` : `${h}h`;
                    })()}
                  </span>
                </p>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </AppLayout>
  );
}
