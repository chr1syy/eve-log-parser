import { useCallback, useEffect, useRef, useState } from "react";
import type { ParsedLog } from "@/lib/types";

export type ShareState = "idle" | "loading" | "copied" | "error";

export interface UseShareLogResult {
  shareState: ShareState;
  handleShare: (log: ParsedLog) => Promise<void>;
}

export function useShareLog(): UseShareLogResult {
  const [shareState, setShareState] = useState<ShareState>("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const scheduleReset = useCallback((delayMs: number = 2000) => {
    // Clear any pending timeout first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Schedule new reset
    timeoutRef.current = setTimeout(() => {
      setShareState("idle");
      timeoutRef.current = null;
    }, delayMs);
  }, []);

  const handleShare = useCallback(
    async (log: ParsedLog) => {
      if (!log) return;
      setShareState("loading");
      try {
        const res = await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ log }),
        });
        if (!res.ok) throw new Error("Upload failed");
        const { uuid } = (await res.json()) as { uuid: string };
        const shareUrl = `${window.location.origin}/share/${uuid}`;
        await navigator.clipboard.writeText(shareUrl);
        setShareState("copied");
        scheduleReset(2000);
      } catch (error) {
        console.error("Share failed:", error);
        setShareState("error");
        scheduleReset(2000);
      }
    },
    [scheduleReset],
  );

  return { shareState, handleShare };
}
