'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFilesAccepted: (files: File[]) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DropZone({ onFilesAccepted }: DropZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: { file: File }[]) => {
      if (rejectedFiles.length > 0) {
        setError('Only .txt and .log files are supported. Please check your file types.');
      } else {
        setError(null);
      }

      if (acceptedFiles.length > 0) {
        const merged = [...files];
        for (const f of acceptedFiles) {
          if (!merged.find((existing) => existing.name === f.name)) {
            merged.push(f);
          }
        }
        setFiles(merged);
        onFilesAccepted(merged);
      }
    },
    [files, onFilesAccepted],
  );

  const removeFile = (name: string) => {
    const updated = files.filter((f) => f.name !== name);
    setFiles(updated);
    onFilesAccepted(updated);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt', '.log'],
      'application/octet-stream': ['.log'],
    },
    multiple: true,
  });

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-sm cursor-pointer transition-all duration-200',
          'flex flex-col items-center justify-center py-12 px-6',
          isDragActive
            ? 'border-cyan-glow bg-[#00d4ff15]'
            : error
              ? 'border-status-kill bg-[#e53e3e08]'
              : 'border-cyan-dim bg-[#00d4ff08] hover:border-cyan-glow hover:bg-[#00d4ff15]',
        )}
      >
        <input {...getInputProps()} />

        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-dim" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-dim" />

        <Upload
          size={48}
          className={cn(
            'mb-4 transition-colors duration-200',
            isDragActive ? 'text-cyan-glow' : 'text-cyan-dim',
          )}
        />

        <h3 className="text-text-primary text-lg font-ui font-bold uppercase tracking-widest mb-2">
          {isDragActive ? 'RELEASE TO UPLOAD' : 'DROP LOG FILES HERE'}
        </h3>

        <p className="text-text-muted text-sm font-mono text-center">
          or click to browse — .txt and .log files supported
        </p>

        {isDragActive && (
          <div className="absolute inset-0 rounded-sm pointer-events-none border-2 border-cyan-glow animate-pulse" />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 border border-status-kill bg-[#e53e3e10] rounded-sm">
          <span className="text-status-kill text-sm font-mono">{error}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-3 px-3 py-2 bg-space border border-border rounded-sm hover:border-cyan-dim transition-colors duration-150"
            >
              <FileText size={14} className="text-cyan-dim flex-shrink-0" />
              <span className="flex-1 text-text-primary text-sm font-mono truncate">{file.name}</span>
              <span className="text-text-muted text-xs font-mono">{formatBytes(file.size)}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.name);
                }}
                className="text-text-muted hover:text-status-kill transition-colors duration-150 ml-1"
                aria-label={`Remove ${file.name}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
