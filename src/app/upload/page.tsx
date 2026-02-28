"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  ChevronRight,
  AlertTriangle,
  LogIn,
  Lock,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import DropZone from "@/components/upload/DropZone";
import ShareButton from "@/components/upload/ShareButton";
import { parseLogFile } from "@/lib/parser";
import { useParsedLogs } from "@/hooks/useParsedLogs";
import { useAuth } from "@/contexts/AuthContext";
import { signIn } from "next-auth/react";
import type { ParsedLog } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const STORAGE_KEY = "eve-parsed-logs";

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function UploadPage() {
  const { setActiveLog } = useParsedLogs();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [parsedLogs, setParsedLogs] = useState<ParsedLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      for (const file of files) {
        const log = await parseLogFile(file);
        results.push(log);
      }

      // Update state with parsed logs
      results.forEach((log) => setActiveLog(log));
      if (results.length > 0) {
        setActiveLog(results[results.length - 1]); // Ensure last is active
      }
      setParsedLogs(results);
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
      <div className="max-w-3xl mx-auto space-y-6">
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
              <Button
                variant="primary"
                size="sm"
                icon={<LogIn size={14} />}
                onClick={() => signIn("eve-sso")}
                className="flex-shrink-0 whitespace-nowrap"
              >
                SIGN IN
              </Button>
            </div>
          </Panel>
        )}

        {/* Drop zone panel */}
        <Panel title="SELECT LOG FILES">
          <DropZone onFilesAccepted={handleFilesAccepted} />
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

        {/* Results */}
        {!isLoading && parsedLogs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-text-secondary text-xs font-ui uppercase tracking-widest">
              PARSE RESULTS — {parsedLogs.length} FILE
              {parsedLogs.length !== 1 ? "S" : ""}
            </h2>
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
            {isAuthenticated && (
              <Panel className="bg-opacity-50">
                <p className="text-text-secondary font-mono text-xs text-center">
                  ✓ Log saved to your account. View all your logs in{" "}
                  <Link
                    href="/history"
                    className="text-cyan-glow hover:text-cyan-mid"
                  >
                    History
                  </Link>
                  .
                </p>
              </Panel>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
