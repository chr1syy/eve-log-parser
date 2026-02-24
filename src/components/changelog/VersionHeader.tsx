import { VersionResponse } from "@/lib/types";

interface VersionHeaderProps {
  versionInfo: VersionResponse | null;
  loading?: boolean;
  error?: string | null;
}

export default function VersionHeader({
  versionInfo,
  loading = false,
  error = null,
}: VersionHeaderProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-space border border-border-default border-t-2 border-t-cyan-dim rounded-sm p-4 md:p-6">
      <h2 className="font-ui text-lg font-semibold text-text-primary uppercase tracking-wide mb-4">
        CURRENT VERSION
      </h2>
      {loading ? (
        <div className="text-text-secondary">
          Loading version information...
        </div>
      ) : error ? (
        <div className="text-status-kill">Error loading version: {error}</div>
      ) : versionInfo ? (
        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <span className="font-mono text-xl text-cyan-glow">
              v{versionInfo.version}
            </span>
            {versionInfo.gitCommit && (
              <span className="font-mono text-sm text-text-secondary">
                {versionInfo.gitCommit.slice(0, 7)}
              </span>
            )}
          </div>
          <div className="text-sm text-text-muted">
            Built: {formatTimestamp(versionInfo.buildTime)}
          </div>
          {versionInfo.gitTag && (
            <div className="text-sm text-gold-bright">
              Tag: {versionInfo.gitTag}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
