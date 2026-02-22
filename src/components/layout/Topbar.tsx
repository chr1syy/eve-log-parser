"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Share2, ChevronDown, FileText, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useParsedLogs } from "@/hooks/useParsedLogs";
import { useShareLog } from "@/hooks/useShareLog";

interface TopbarProps {
  title: string;
}

function truncate(name: string, max = 24): string {
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}

export default function Topbar({ title }: TopbarProps) {
  const router = useRouter();
  const { logs, activeLog, setActiveLog, removeLog } = useParsedLogs();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { shareState, handleShare } = useShareLog();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;

    function handleMouseDown(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [dropdownOpen]);

  const shareLabel =
    shareState === "copied"
      ? "COPIED!"
      : shareState === "error"
        ? "FAILED"
        : "SHARE";

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-space border-b border-border flex-shrink-0">
      {/* Left: page title */}
      <h1 className="text-xl font-ui font-bold uppercase tracking-widest text-text-primary">
        {title}
      </h1>

      {/* Right: actions */}
      <div className="flex items-center gap-4">
        {/* System online indicator */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-status-safe animate-pulse flex-shrink-0" />
          <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
            System Online
          </span>
        </div>

        {/* Log selector */}
        {logs.length > 0 && activeLog && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => logs.length > 1 && setDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary font-mono text-xs rounded-sm hover:border-cyan-dim transition-colors"
            >
              <FileText className="w-3 h-3 text-text-muted flex-shrink-0" />
              <span>{truncate(activeLog.fileName)}</span>
              {logs.length > 1 && (
                <ChevronDown className="w-3 h-3 text-text-muted" />
              )}
            </button>

            {dropdownOpen && logs.length > 1 && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-panel border border-border rounded-sm shadow-lg min-w-[200px]">
                {logs.map((log) => (
                  <div
                    key={log.sessionId}
                    className="flex items-center group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLog(log);
                        setDropdownOpen(false);
                      }}
                      className="flex-1 text-left px-3 py-2 font-mono text-xs text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors"
                    >
                      {log.fileName}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLog(log.sessionId);
                      }}
                      className="px-2 py-2 text-text-muted hover:text-status-kill transition-colors opacity-0 group-hover:opacity-100"
                      aria-label={`Remove ${log.fileName}`}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
  );
}
