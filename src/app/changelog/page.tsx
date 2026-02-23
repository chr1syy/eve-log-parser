"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";

interface VersionInfo {
  version: string;
  buildTime: string;
  gitCommit?: string;
  gitTag?: string;
}

interface CommitEntry {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  url?: string;
}

interface ChangelogResponse {
  commits: CommitEntry[];
}

export default function ChangelogPage() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [changelog, setChangelog] = useState<ChangelogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [versionRes, changelogRes] = await Promise.all([
          fetch("/api/version"),
          fetch("/api/changelog"),
        ]);

        if (!versionRes.ok || !changelogRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const versionData = await versionRes.json();
        const changelogData = await changelogRes.json();

        setVersionInfo(versionData);
        setChangelog(changelogData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <AppLayout title="CHANGELOG">
      <div className="space-y-8">
        {/* Current Version Section */}
        <div className="bg-space border border-border-default border-t-2 border-t-cyan-dim rounded-sm p-6">
          <h2 className="font-ui text-lg font-semibold text-text-primary uppercase tracking-wide mb-4">
            CURRENT VERSION
          </h2>
          {loading ? (
            <div className="text-text-secondary">
              Loading version information...
            </div>
          ) : error ? (
            <div className="text-status-kill">
              Error loading version: {error}
            </div>
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

        {/* Changelog Section */}
        <div className="bg-space border border-border-default border-t-2 border-t-cyan-dim rounded-sm p-6">
          <h2 className="font-ui text-lg font-semibold text-text-primary uppercase tracking-wide mb-4">
            COMMIT HISTORY
          </h2>
          {loading ? (
            <div className="text-text-secondary">Loading changelog...</div>
          ) : error ? (
            <div className="text-status-kill">
              Error loading changelog: {error}
            </div>
          ) : changelog && changelog.commits.length > 0 ? (
            <div className="space-y-4">
              {changelog.commits.map((commit, index) => (
                <div
                  key={commit.hash}
                  className="border-b border-border-subtle pb-4 last:border-b-0 hover:bg-elevated transition-colors duration-150"
                >
                  <div className="flex items-start justify-between space-x-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-mono text-sm text-cyan-dim">
                          {commit.hash.slice(0, 7)}
                        </span>
                        <span className="text-sm text-text-secondary">
                          by {commit.author}
                        </span>
                        <span className="text-sm text-text-muted">
                          {formatTimestamp(commit.timestamp)}
                        </span>
                      </div>
                      <div className="text-text-primary mb-2">
                        {commit.message}
                      </div>
                      {commit.url && (
                        <a
                          href={commit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-glow hover:text-cyan-mid transition-colors text-sm"
                        >
                          View on GitHub →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-text-secondary">No commits found</div>
              <div className="text-text-muted text-sm mt-2">
                The changelog is currently empty. New commits will appear here
                as they are made.
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
