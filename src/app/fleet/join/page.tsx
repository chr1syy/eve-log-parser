"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

export default function JoinFleetSessionPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Extract id from code (assuming format FLEET-XXXXXX)
    const id = code.replace(/^FLEET-/, "");
    if (!id || id === code) {
      setError("Invalid session code format. Code should start with FLEET-");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/fleet-sessions/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to join session");
      }

      // On success, redirect to session page
      router.push(`/fleet/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-ui uppercase tracking-wider text-text-primary">
        Join Fleet Session
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-text-primary mb-2"
          >
            Fleet Session Code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text-primary placeholder-text-muted font-mono"
            placeholder="FLEET-XXXXXX"
            required
          />
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={loading || !code}>
          {loading ? "Joining..." : "Join Session"}
        </Button>
      </form>
    </div>
  );
}
