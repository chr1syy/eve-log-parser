"use client";

import { Link as LinkIcon, Check, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import type { ParsedLog } from "@/lib/types";
import { useShareLog } from "@/hooks/useShareLog";

interface ShareButtonProps {
  log: ParsedLog;
}

export default function ShareButton({ log }: ShareButtonProps) {
  const { shareState, handleShare } = useShareLog();

  const icon =
    shareState === "loading" ? (
      <Loader2 size={12} className="animate-spin" />
    ) : shareState === "copied" ? (
      <Check size={12} />
    ) : (
      <LinkIcon size={12} />
    );

  const label =
    shareState === "copied"
      ? "LINK COPIED"
      : shareState === "error"
        ? "SHARE FAILED"
        : "SHARE";

  return (
    <Button
      variant="secondary"
      size="sm"
      icon={icon}
      onClick={() => handleShare(log)}
      disabled={shareState === "loading"}
    >
      {label}
    </Button>
  );
}
