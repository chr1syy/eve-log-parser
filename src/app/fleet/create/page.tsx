"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useFleetSessionDispatch } from "@/contexts/FleetContext";
import type { FleetSession } from "@/types/fleet";

export default function CreateFleetSessionPage() {
  const [fightName, setFightName] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<FleetSession | null>(
    null,
  );
  const dispatch = useFleetSessionDispatch();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/fleet-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fightName: fightName.trim() || undefined,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create session");
      }

      const data = await response.json();
      // Fetch the full session to add to context
      const sessionResponse = await fetch(`/api/fleet-sessions/${data.id}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        dispatch({ type: "CREATE_SESSION", payload: sessionData.session });
      }

      setCreatedSession(data); // partial, but for display
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (createdSession) {
      try {
        await navigator.clipboard.writeText(createdSession.code);
        // TODO: Show copy success message
      } catch (err) {
        console.error("Failed to copy code:", err);
      }
    }
  };

  if (createdSession) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-ui uppercase tracking-wider text-text-primary">
          Fleet Session Created
        </h1>
        <div className="bg-green-900/20 border border-green-500/50 rounded p-4">
          <p className="text-green-400 mb-2">
            Session created successfully! Share the code with your fleet.
          </p>
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-lg">{createdSession.code}</span>
            <Button size="sm" onClick={handleCopyCode}>
              Copy Code
            </Button>
          </div>
          <Link href={`/fleet/${createdSession.id}`}>
            <Button>Go to Session</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-ui uppercase tracking-wider text-text-primary">
        Create New Fleet Session
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label
            htmlFor="fightName"
            className="block text-sm font-medium text-text-primary mb-2"
          >
            Fight Name (Optional)
          </label>
          <input
            id="fightName"
            type="text"
            value={fightName}
            onChange={(e) => setFightName(e.target.value)}
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text-primary placeholder-text-muted"
            placeholder="e.g., Angel Cartel Assault"
          />
        </div>

        <div>
          <label
            htmlFor="tags"
            className="block text-sm font-medium text-text-primary mb-2"
          >
            Tags (Optional, comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text-primary placeholder-text-muted"
            placeholder="e.g., pvp, incursion, high-sec"
          />
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Session"}
        </Button>
      </form>
    </div>
  );
}
