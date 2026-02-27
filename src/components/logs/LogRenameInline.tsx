"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, X } from "lucide-react";

interface Props {
  value: string;
  placeholder?: string;
  onRename: (newName: string) => Promise<boolean> | void;
}

export default function LogRenameInline({
  value,
  placeholder,
  onRename,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initialize name from prop only when user starts editing to avoid
  // calling setState synchronously inside an effect (causes cascading renders).

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.select();
  }, [editing]);

  async function handleSubmit() {
    const trimmed = (name ?? "").trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }
    try {
      const res = await onRename(trimmed);
      // If callback returns boolean false, treat as failure
      if (typeof res === "boolean" && res === false) {
        setError("Failed to save name");
        return;
      }
      setEditing(false);
      setError(null);
    } catch {
      setError("Failed to save name");
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            aria-label="Edit log name"
            className="px-2 py-1 border border-border rounded text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmit();
              if (e.key === "Escape") {
                setName(value ?? "");
                setEditing(false);
                setError(null);
              }
            }}
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            className="text-xs px-2 py-1 border border-border rounded"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setName(value ?? "");
              setEditing(false);
              setError(null);
            }}
            title="Cancel"
            className="text-text-muted"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="truncate">{value || placeholder || "Unnamed"}</span>
          <button
            type="button"
            onClick={() => {
              setName(value ?? "");
              setEditing(true);
            }}
            aria-label="Rename log"
            className="text-text-muted hover:text-text-primary"
          >
            <Pencil size={12} />
          </button>
        </div>
      )}
      {error && <span className="text-status-kill text-xs">{error}</span>}
    </div>
  );
}
