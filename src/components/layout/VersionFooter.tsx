"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VersionResponse } from "@/lib/types";

export default function VersionFooter() {
  const [versionInfo, setVersionInfo] = useState<VersionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const res = await fetch("/api/version");
        if (res.ok) {
          const data = await res.json();
          setVersionInfo(data);
        }
      } catch {
        // Silently fail for footer
      } finally {
        setLoading(false);
      }
    };

    fetchVersion();
  }, []);

  if (loading || !versionInfo) {
    return null; // Or show loading text if preferred
  }

  return (
    <footer className="flex h-12 flex-shrink-0 items-center justify-center bg-space border-t border-border px-6">
      <Link
        href="/changelog"
        className="inline-flex h-4 items-center text-xs font-mono uppercase tracking-wider leading-none text-text-secondary hover:text-cyan-glow transition-colors"
      >
        v{versionInfo.version}
      </Link>
    </footer>
  );
}
