"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

interface LogUploadFormProps {
  sessionId: string;
  onSuccess: () => void;
}

export default function LogUploadForm({
  sessionId,
  onSuccess,
}: LogUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pilotName, setPilotName] = useState("");
  const [shipType, setShipType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".txt")) {
        setError("Please select a .txt file");
        setFile(null);
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        // 10MB limit
        setError("File too large. Maximum size is 10MB");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);

      if (!pilotName.trim()) {
        try {
          const text = await selectedFile.text();
          const listenerMatch = text.match(/^Listener:\s+(.+)$/m);
          if (listenerMatch) {
            setPilotName(listenerMatch[1].trim());
          }
        } catch {
          // ignore read errors
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a log file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (pilotName.trim()) {
        formData.append("pilotName", pilotName.trim());
      }
      if (shipType.trim()) {
        formData.append("shipType", shipType.trim());
      }

      const response = await fetch(`/api/fleet-sessions/${sessionId}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setSuccess(true);
      setFile(null);
      setPilotName("");
      setShipType("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-900/20 border border-green-500/50 rounded p-4">
        <p className="text-green-400">Log uploaded successfully!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="file"
          className="block text-base font-medium text-text-primary mb-2"
        >
          Log File (.txt)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="file"
            type="file"
            accept=".txt"
            onChange={handleFileChange}
            className="sr-only"
            required
          />
          <label
            htmlFor="file"
            className="px-3 py-2 bg-bg-secondary border border-border rounded text-text-primary cursor-pointer"
          >
            Choose File
          </label>
          <span className="text-sm text-text-muted">
            {file ? file.name : "No file selected"}
          </span>
        </div>
      </div>

      <div>
        <label
          htmlFor="pilotName"
          className="block text-base font-medium text-text-primary mb-2"
        >
          Pilot Name (auto-detect if blank)
        </label>
        <input
          id="pilotName"
          type="text"
          value={pilotName}
          onChange={(e) => setPilotName(e.target.value)}
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text-primary placeholder-text-muted"
          placeholder="Leave blank to auto-detect"
        />
      </div>

      <div>
        <label
          htmlFor="shipType"
          className="block text-base font-medium text-text-primary mb-2"
        >
          Ship Type (Optional)
        </label>
        <input
          id="shipType"
          type="text"
          value={shipType}
          onChange={(e) => setShipType(e.target.value)}
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text-primary placeholder-text-muted"
          placeholder="e.g., Drake"
        />
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Uploading..." : "Upload Log"}
      </Button>
    </form>
  );
}
