import { Upload } from 'lucide-react';

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-space border-b border-border flex-shrink-0">
      {/* Left: page title */}
      <h1 className="text-xl font-ui font-bold uppercase tracking-widest text-text-primary">
        {title}
      </h1>

      {/* Right: actions */}
      <div className="flex items-center gap-4">
        {/* System online indicator */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-status-safe animate-pulse flex-shrink-0" />
          <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
            System Online
          </span>
        </div>

        {/* Upload Logs button */}
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-1.5 border border-cyan-glow text-cyan-glow font-ui font-semibold uppercase tracking-wider text-sm rounded-sm transition-all duration-150 hover:bg-cyan-ghost hover:shadow-[0_0_12px_#00d4ff40]"
        >
          <Upload className="w-4 h-4" />
          Upload Logs
        </button>
      </div>
    </header>
  );
}
