"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  ChevronRight,
  AlertTriangle,
  Lock,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import DropZone from "@/components/upload/DropZone";
import ShareButton from "@/components/upload/ShareButton";
import EveSsoButton from "@/components/auth/EveSsoButton";
import { parseLogFile } from "@/lib/parser";
import { useParsedLogs } from "@/hooks/useParsedLogs";
import { useAuth } from "@/contexts/AuthContext";
import { signIn } from "next-auth/react";
import LogRenameInline from "@/components/logs/LogRenameInline";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { ParsedLog } from "@/lib/types";

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatMinutes(minutes: number): string {
  const mins = Math.round(minutes);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function UploadPage() {
  const {
    setActiveLog,
    logs: rawLogs,
    activeLog,
    removeLog,
    updateLogMetadata,
    userId,
  } = useParsedLogs();
  const logs = rawLogs ?? [];
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [parsedLogs, setParsedLogs] = useState<ParsedLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pagedLogs = logs.slice(pageStart, pageEnd);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleFilesAccepted = (accepted: File[]) => {
    setFiles(accepted);
    // Reset results when file list changes
    setParsedLogs([]);
    setError(null);
  };

  const handleParse = async () => {
    if (files.length === 0) return;

    setIsLoading(true);
    setError(null);
    setParsedLogs([]);

    try {
      const results: ParsedLog[] = [];
      const raws: Array<{ text: string; fileName: string }> = [];
      for (const file of files) {
        const [rawText, log] = await Promise.all([
          file.text(),
          parseLogFile(file),
        ]);
        results.push(log);
        raws.push({ text: rawText, fileName: file.name });
      }

      // Update state with parsed logs
      results.forEach((log, idx) => {
        const raw = raws[idx];
        setActiveLog(log, raw?.text, raw?.fileName);
      });
      setParsedLogs(results);
      // Clear the file input list after parsing so we don't re-parse the same files
      setFiles([]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during parsing.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout title="UPLOAD LOGS">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Authentication info banner for unauthenticated users */}
        {!authLoading && !isAuthenticated && (
          <Panel variant="default" className="border-t-cyan-glow bg-opacity-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Lock
                  size={18}
                  className="text-cyan-glow flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-cyan-glow font-ui font-semibold uppercase tracking-wider text-sm mb-1">
                    Sign in to Save Logs
                  </p>
                  <p className="text-text-muted font-mono text-sm">
                    Authenticate with EVE Online to save logs across devices and
                    manage multiple character logs.
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <EveSsoButton
                  size="small"
                  variant="white"
                  onClick={() => signIn("eve-sso")}
                />
              </div>
            </div>
          </Panel>
        )}

        {/* Drop zone panel */}
        <Panel title="SELECT LOG FILES">
          <DropZone onFilesAccepted={handleFilesAccepted} files={files} />
          {!authLoading && !isAuthenticated && (
            <p className="text-text-muted font-mono text-xs mt-4 pt-4 border-t border-border-subtle">
              📝 Uploading without signing in? Your current log will be replaced
              by the next upload.
            </p>
          )}
        </Panel>

        {/* Parse button */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="lg"
            disabled={files.length === 0 || isLoading}
            onClick={handleParse}
          >
            PARSE LOGS
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <Panel>
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 size={36} className="text-cyan-glow animate-spin" />
              <p className="text-cyan-glow font-ui font-semibold uppercase tracking-widest text-sm">
                INITIALIZING PARSE SEQUENCE...
              </p>
              <p className="text-text-muted font-mono text-xs">
                Processing {files.length} file{files.length !== 1 ? "s" : ""}
              </p>
            </div>
          </Panel>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <Panel variant="default" className="border-t-status-kill">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                className="text-status-kill flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-status-kill font-ui font-semibold uppercase tracking-wider text-sm mb-1">
                  Parse Error
                </p>
                <p className="text-text-secondary font-mono text-sm">{error}</p>
              </div>
            </div>
          </Panel>
        )}

        {/* Results: prefer persisted user logs list; fall back to recently parsed results */}
        {!isLoading &&
          (logs.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-text-secondary text-xs font-ui uppercase tracking-widest">
                YOUR LOGS — {logs.length}
              </h2>
              <div className="space-y-2">
                {pagedLogs.map((l) => (
                  <Panel
                    key={l.sessionId}
                    variant={
                      l.sessionId === activeLog?.sessionId
                        ? "accent"
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-text-primary font-ui font-semibold text-base truncate mb-1">
                            {l.displayName ?? l.fileName}
                          </p>
                          <div className="flex items-center gap-2">
                            <LogRenameInline
                              value={l.displayName ?? l.fileName}
                              placeholder={l.fileName}
                              onRename={async (newName: string) => {
                                try {
                                  const uid = userId || undefined;
                                  if (uid) {
                                    const res = await fetch(
                                      `/api/user-logs/${l.sessionId}?userId=${uid}`,
                                      {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          displayName: newName,
                                        }),
                                      },
                                    );
                                    if (res.ok) {
                                      updateLogMetadata(l.sessionId, {
                                        displayName: newName,
                                      });
                                      return true;
                                    }
                                  }
                                  const res2 = await fetch(
                                    `/api/logs/${l.sessionId}`,
                                    {
                                      method: "PATCH",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        displayName: newName,
                                      }),
                                    },
                                  );
                                  if (res2.ok) {
                                    updateLogMetadata(l.sessionId, {
                                      displayName: newName,
                                    });
                                    return true;
                                  }
                                  return false;
                                } catch {
                                  return false;
                                }
                              }}
                            />

                            <button
                              className="text-text-muted hover:text-status-kill"
                              onClick={() => {
                                setPendingDelete(l.sessionId);
                                setConfirmOpen(true);
                              }}
                              title="Delete log"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-2 mt-2">
                          <div>
                            <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                              Pilot
                            </p>
                            <p className="text-text-primary font-mono text-sm">
                              {l.characterName ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                              Total Events
                            </p>
                            <p className="text-text-primary font-mono text-sm">
                              {formatNumber(l.stats.totalEvents)}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                              Damage Dealt
                            </p>
                            <p className="text-gold-bright font-mono text-sm">
                              {formatNumber(l.stats.damageDealt)}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                              Damage Received
                            </p>
                            <p className="text-status-kill font-mono text-sm">
                              {formatNumber(l.stats.damageReceived)}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                              Active Time
                            </p>
                            <p className="text-cyan-glow font-mono text-sm">
                              {formatMinutes(l.stats.activeTimeMinutes)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end flex-shrink-0 mt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            setActiveLog(l);
                            await router.push("/");
                          }}
                          className="flex items-center gap-1 text-cyan-glow text-sm font-ui font-semibold uppercase tracking-wider hover:text-cyan-mid transition-colors duration-150"
                        >
                          VIEW REPORT
                          <ChevronRight size={14} />
                        </button>
                        <ShareButton log={l} />
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
              {logs.length > pageSize && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-text-muted font-mono text-xs">
                    Showing {pageStart + 1}-{Math.min(pageEnd, logs.length)} of{" "}
                    {logs.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                      Prev
                    </Button>
                    <p className="text-text-secondary font-mono text-xs">
                      Page {page} of {totalPages}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() =>
                        setPage((prev) => Math.min(totalPages, prev + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // fallback: recently parsed logs (transient)
            parsedLogs.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-text-secondary text-xs font-ui uppercase tracking-widest">
                  PARSE RESULTS — {parsedLogs.length} FILE
                  {parsedLogs.length !== 1 ? "S" : ""}
                </h2>
                {isAuthenticated && (
                  <p className="text-text-secondary font-mono text-xs">
                    Log saved to your account.
                  </p>
                )}
                {parsedLogs.map((log) => (
                  <Panel key={log.sessionId} variant="accent">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-ui font-semibold text-base truncate mb-3">
                          {log.fileName}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
                          <div>
                            <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                              Total Events
                            </p>
                            <p className="text-text-primary font-mono text-sm">
                              {formatNumber(log.stats.totalEvents)}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                              Damage Dealt
                            </p>
                            <p className="text-gold-bright font-mono text-sm">
                              {formatNumber(log.stats.damageDealt)}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                              Damage Received
                            </p>
                            <p className="text-status-kill font-mono text-sm">
                              {formatNumber(log.stats.damageReceived)}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-muted text-xs font-ui uppercase tracking-widest mb-0.5">
                              Active Time
                            </p>
                            <p className="text-cyan-glow font-mono text-sm">
                              {formatMinutes(log.stats.activeTimeMinutes)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end flex-shrink-0 mt-1">
                        <Link
                          href="/"
                          className="flex items-center gap-1 text-cyan-glow text-sm font-ui font-semibold uppercase tracking-wider hover:text-cyan-mid transition-colors duration-150"
                        >
                          VIEW REPORT
                          <ChevronRight size={14} />
                        </Link>
                        <ShareButton log={log} />
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
            )
          ))}
      </div>
      <ConfirmModal
        open={confirmOpen}
        title="Delete Log"
        message={
          pendingDelete
            ? `Delete this log? This action cannot be undone.`
            : "Delete this log?"
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => {
          if (pendingDelete) removeLog(pendingDelete);
          setPendingDelete(null);
          setConfirmOpen(false);
        }}
        onCancel={() => {
          setPendingDelete(null);
          setConfirmOpen(false);
        }}
      />
    </AppLayout>
  );
}
