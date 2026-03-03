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
        const payload = { log, share: true };
        const jsonString = JSON.stringify(payload);

        const res = await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonString,
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[Share] API error response: ${errorText}`);
          throw new Error(`Upload failed: ${res.status}`);
        }

        const data = (await res.json()) as {
          uuid?: string;
          sessionId?: string;
          id?: string;
        };
        const uuid = data.uuid ?? data.sessionId ?? data.id;
        if (!uuid) {
          throw new Error("Share response missing uuid");
        }
        const shareUrl = `${window.location.origin}/share/${uuid}`;
        console.log(`[Share] Generated share URL: ${shareUrl}`);

        // Try to copy to clipboard, but success doesn't depend on it
        if (navigator?.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(shareUrl);
            console.log(`[Share] Successfully copied to clipboard`);
          } catch (clipErr) {
            console.warn(`[Share] Clipboard copy failed:`, clipErr);
            // Still show success - sharing worked, just clipboard failed
          }
        } else {
          console.warn(
            `[Share] Clipboard API unavailable on this URL (likely local network IP)`,
          );
          // Still show success - sharing worked, just clipboard unavailable
        }

        // Show "copied" state to indicate successful share
        // (even if clipboard copy failed, the URL is shareable)
        setShareState("copied");
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
