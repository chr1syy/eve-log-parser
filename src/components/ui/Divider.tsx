import { cn } from '@/lib/utils';

interface DividerProps {
  label?: string;
  variant?: 'default' | 'eve';
  className?: string;
}

export default function Divider({ label, variant = 'default', className }: DividerProps) {
  if (!label) {
    return <hr className={cn('border-t border-border', className)} />;
  }

  const text =
    variant === 'eve' ? (
      <>
        <span className="text-cyan-dim">◆</span>
        <span className="px-3 text-text-muted text-xs uppercase tracking-widest font-ui">
          {label}
        </span>
        <span className="text-cyan-dim">◆</span>
      </>
    ) : (
      <span className="px-3 bg-space text-text-muted text-xs uppercase tracking-widest font-ui">
        {label}
      </span>
    );

  return (
    <div className={cn('relative flex items-center', className)}>
      <span className="flex-1 border-t border-border" />
      <span className="flex items-center bg-space">{text}</span>
      <span className="flex-1 border-t border-border" />
    </div>
  );
}
