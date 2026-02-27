"use client";

import { useState } from "react";
import {
  Upload,
  Share2,
  ChevronDown,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useParsedLogs } from "@/hooks/useParsedLogs";
import { useShareLog } from "@/hooks/useShareLog";

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  const router = useRouter();
  const { logs, activeLog, userId, needsRecovery, restoreFromUserId } =
    useParsedLogs();
  const { shareState, handleShare } = useShareLog();

  // Recovery banner state
  const [restoreInput, setRestoreInput] = useState("");
  const [restoreStatus, setRestoreStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [restoredCount, setRestoredCount] = useState(0);

  // User ID copy state
  const [copied, setCopied] = useState(false);

  // No dropdown interaction in Topbar — log management moved to Upload page

  const shareLabel =
    shareState === "copied"
      ? "COPIED!"
      : shareState === "error"
        ? "FAILED"
        : "SHARE";

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  async function handleRestore() {
    const uuid = restoreInput.trim();
    if (!UUID_RE.test(uuid)) {
      setRestoreStatus("error");
      return;
    }
    setRestoreStatus("loading");
    try {
      const count = await restoreFromUserId(uuid);
      if (count > 0) {
        setRestoredCount(count);
        setRestoreStatus("success");
      } else {
        setRestoreStatus("error");
      }
    } catch {
      setRestoreStatus("error");
    }
  }

  function handleCopyUserId() {
    if (!userId) return;
    navigator.clipboard
      .writeText(userId)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 bg-space border-b border-border flex-shrink-0">
        {/* Left: page title */}
        <h1 className="text-xl font-ui font-bold uppercase tracking-widest text-text-primary">
          {title}
        </h1>

        {/* Right: actions */}
        <div className="flex items-center gap-4">
          {/* User ID indicator (Scenario B — shown when session is normal) */}
          {!needsRecovery && userId && (
            <button
              type="button"
              onClick={handleCopyUserId}
              title={userId}
              className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors"
              aria-label="Copy User ID"
            >
              {copied ? (
                <Check className="w-3 h-3 text-status-safe flex-shrink-0" />
              ) : (
                <Copy className="w-3 h-3 flex-shrink-0" />
              )}
              <span className="font-mono text-xs">{userId.slice(0, 8)}…</span>
            </button>
          )}

          {/* System online indicator */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-safe animate-pulse flex-shrink-0" />
            <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
              System Online
            </span>
          </div>

          {/* Log selector */}
          {logs.length > 0 && activeLog && (
            <div>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary font-mono text-xs rounded-sm hover:border-cyan-dim transition-colors"
              >
                <FileText className="w-3 h-3 text-text-muted flex-shrink-0" />
                <span className="truncate">
                  {activeLog.displayName ?? activeLog.fileName}
                </span>
              </button>
            </div>
          )}

          {/* Share button */}
          {activeLog !== null && (
            <button
              type="button"
              onClick={() => activeLog && handleShare(activeLog)}
              disabled={shareState === "loading"}
              className="flex items-center gap-2 px-3 py-1.5 border border-border text-text-secondary font-ui font-semibold uppercase tracking-wider text-xs rounded-sm transition-all duration-150 hover:border-cyan-dim hover:text-text-primary disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5" />
              {shareLabel}
            </button>
          )}

          {/* Upload Logs button */}
          <button
            type="button"
            onClick={() => router.push("/upload")}
            className="flex items-center gap-2 px-4 py-1.5 border border-cyan-glow text-cyan-glow font-ui font-semibold uppercase tracking-wider text-sm rounded-sm transition-all duration-150 hover:bg-cyan-ghost hover:shadow-[0_0_12px_#00d4ff40]"
          >
            <Upload className="w-4 h-4" />
            Upload Logs
          </button>
        </div>
      </header>

      {/* Recovery banner (Scenario A — full cache wipe) */}
      {needsRecovery && (
        <div className="flex-shrink-0 px-6 py-3 bg-amber-950/40 border-b border-amber-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-amber-400 font-mono text-xs uppercase tracking-wider flex-shrink-0">
              SESSION DATA LOST OR NEW USER — Enter a previous User ID to
              restore logs
            </p>
            <div className="flex items-center gap-2 sm:ml-auto">
              <input
                type="text"
                value={restoreInput}
                onChange={(e) => {
                  setRestoreInput(e.target.value);
                  setRestoreStatus("idle");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleRestore()}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="px-3 py-1 bg-void border border-amber-500/40 text-text-secondary font-mono text-xs rounded-sm placeholder:text-text-muted focus:outline-none focus:border-amber-400 w-72"
                disabled={restoreStatus === "loading"}
              />
              <button
                type="button"
                onClick={handleRestore}
                disabled={restoreStatus === "loading" || !restoreInput.trim()}
                className="px-3 py-1 border border-amber-500/60 text-amber-400 font-ui font-semibold uppercase tracking-wider text-xs rounded-sm transition-colors hover:bg-amber-500/10 disabled:opacity-50"
              >
                {restoreStatus === "loading" ? "…" : "RESTORE"}
              </button>
            </div>
            {restoreStatus === "success" && (
              <p className="text-status-safe font-mono text-xs flex-shrink-0">
                {restoredCount} log{restoredCount !== 1 ? "s" : ""} restored
              </p>
            )}
            {restoreStatus === "error" && (
              <p className="text-status-kill font-mono text-xs flex-shrink-0">
                No logs found for that ID
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
