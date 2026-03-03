"use client";

import { useState } from "react";
import { Trash2, Eye, Calendar, HardDrive, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LogHistoryItemProps {
  id: string;
  filename: string;
  uploadedAt: Date;
  fileSize?: number;
  combatDuration?: number; // in minutes
  isSelected?: boolean;
  onView: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function LogHistoryItem({
  id,
  filename,
  uploadedAt,
  fileSize,
  combatDuration,
  isSelected = false,
  onView,
  onDelete,
}: LogHistoryItemProps) {
  const [viewLoading, setViewLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleView = async () => {
    setViewLoading(true);
    try {
      await onView(id);
    } catch (error) {
      console.error("Error viewing log:", error);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await onDelete(id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting log:", error);
      setDeleteLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "—";
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-4 px-4 py-3 border border-border rounded",
          "transition-all duration-150",
          isSelected
            ? "bg-cyan-ghost border-cyan-glow"
            : "bg-elevated hover:bg-elevated-hover hover:border-cyan-glow",
        )}
      >
        {/* Filename */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-mono text-text-primary truncate">
            {filename}
          </div>
          <div className="text-xs text-text-muted mt-1 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(uploadedAt)}
            </div>
            {fileSize !== undefined && (
              <div className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatBytes(fileSize)}
              </div>
            )}
            {combatDuration !== undefined && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(combatDuration)}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleView}
            disabled={viewLoading}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm font-ui rounded",
              "border border-cyan-glow text-cyan-glow",
              "hover:bg-cyan-ghost transition-all duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <Eye className="w-4 h-4" />
            {viewLoading ? "Loading..." : "View"}
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteLoading}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm font-ui rounded",
                "border border-red-500/50 text-red-500/70",
                "hover:bg-red-500/10 hover:border-red-500 hover:text-red-500",
                "transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Confirm?</span>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-2 py-1 text-xs font-ui bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {deleteLoading ? "..." : "Yes"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className="px-2 py-1 text-xs font-ui border border-text-muted text-text-muted rounded hover:border-text-primary hover:text-text-primary"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
