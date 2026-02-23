import { CommitEntry } from "@/lib/types";

interface ChangelogListProps {
  commits: CommitEntry[];
  loading?: boolean;
  error?: string | null;
}

export default function ChangelogList({
  commits,
  loading = false,
  error = null,
}: ChangelogListProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return <div className="text-text-secondary">Loading changelog...</div>;
  }

  if (error) {
    return (
      <div className="text-status-kill">Error loading changelog: {error}</div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-text-secondary">No commits found</div>
        <div className="text-text-muted text-sm mt-2">
          The changelog is currently empty. New commits will appear here as they
          are made.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {commits.map((commit) => (
        <div
          key={commit.hash}
          className="border border-border-subtle rounded-sm p-3 hover:bg-elevated hover:border-border-active transition-colors duration-150"
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
              <div className="text-text-primary mb-2">{commit.message}</div>
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
  );
}
