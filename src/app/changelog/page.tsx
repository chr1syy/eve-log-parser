"use client";

import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import VersionHeader from "../../components/changelog/VersionHeader";
import ChangelogList from "../../components/changelog/ChangelogList";
import { VersionResponse, ChangelogResponse } from "../../lib/types";

export default function ChangelogPage() {
  const [versionInfo, setVersionInfo] = useState<VersionResponse | null>(null);
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

  return (
    <AppLayout title="CHANGELOG">
      <div className="space-y-8">
        <VersionHeader
          versionInfo={versionInfo}
          loading={loading}
          error={error}
        />

        {/* Changelog Section */}
        <div className="bg-space border border-border-default border-t-2 border-t-cyan-dim rounded-sm p-6">
          <h2 className="font-ui text-lg font-semibold text-text-primary uppercase tracking-wide mb-4">
            COMMIT HISTORY
          </h2>
          <ChangelogList
            commits={changelog?.commits || []}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    </AppLayout>
  );
}
