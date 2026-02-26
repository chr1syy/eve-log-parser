"use client";

import { useState } from "react";
import Link from "next/link";

import AppLayout from "@/components/layout/AppLayout";
import Button from "@/components/ui/Button";
import { useFleetSessionDispatch } from "@/contexts/FleetContext";
import type { FleetSession } from "@/types/fleet";

export const dynamic = "force-dynamic";

export default function CreateFleetSessionPage() {
  const [fightName, setFightName] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<FleetSession | null>(
    null,
  );
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dispatch = useFleetSessionDispatch();

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

      // Persist session UUID locally so this browser can see the fleet
      try {
        const stored = JSON.parse(
          localStorage.getItem("fleet:session-ids") ?? "[]",
        ) as string[];
        if (!stored.includes(data.id)) {
          localStorage.setItem(
            "fleet:session-ids",
            JSON.stringify([...stored, data.id]),
          );
        }
      } catch {
        /* localStorage unavailable */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!createdSession) return;
    setCopyError(null);
    setCopied(false);

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(createdSession.code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = createdSession.code;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (!success) {
        throw new Error("Copy failed");
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
      setCopyError("Copy failed. Please select and copy manually.");
    }
  };

  if (createdSession) {
    return (
      <AppLayout title="CREATE FLEET SESSION">
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
                {copied ? "Copied" : "Copy Code"}
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-green-400 mb-2">Code copied.</p>
            )}
            {copyError && (
              <p className="text-sm text-red-400 mb-2">{copyError}</p>
            )}
            <Link href={`/fleet/${createdSession.id}`}>
              <Button>Go to Session</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="CREATE FLEET SESSION">
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
    </AppLayout>
  );
}
