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
        // Log the payload size for debugging
        const payload = { log };
        const jsonString = JSON.stringify(payload);
        const sizeInMB = jsonString.length / (1024 * 1024);
        console.log(
          `[Share] Sending log: ${sizeInMB.toFixed(2)}MB (${jsonString.length} bytes)`,
        );

        const res = await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonString,
        });

        console.log(`[Share] API response status: ${res.status}`);

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[Share] API error response: ${errorText}`);
          throw new Error(`Upload failed: ${res.status}`);
        }

        const { uuid } = (await res.json()) as { uuid: string };
        const shareUrl = `${window.location.origin}/share/${uuid}`;
        console.log(`[Share] Generated URL: ${shareUrl}`);

        // Check if clipboard API is available
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
          setShareState("copied");
          console.log(`[Share] Successfully copied to clipboard`);
        } else {
          // Fallback: log to console if clipboard not available
          console.warn("Clipboard API not available, share URL:", shareUrl);
          setShareState("error");
        }
        scheduleReset(2000);
      } catch (error) {
        console.error("[Share] Error:", error);
        setShareState("error");
        scheduleReset(2000);
      }
    },
    [scheduleReset],
  );

  return { shareState, handleShare };
}
