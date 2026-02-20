import { cn } from '@/lib/utils';

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  variant?: 'default' | 'accent' | 'gold';
  className?: string;
}

const variantStyles: Record<NonNullable<PanelProps['variant']>, string> = {
  default:
    'bg-space border border-border border-t-2 border-t-cyan-dim rounded-sm shadow-lg',
  accent:
    'bg-space border border-border border-t-2 border-t-cyan-glow rounded-sm shadow-lg shadow-[0_0_0_1px_#00d4ff20,0_4px_24px_rgba(0,0,0,0.6)]',
  gold:
    'bg-space border border-border border-t-2 border-t-gold-bright rounded-sm shadow-lg shadow-[0_0_0_1px_#c9a22720,0_4px_24px_rgba(0,0,0,0.6)]',
};

export function Panel({ children, title, variant = 'default', className }: PanelProps) {
  return (
    <div
      className={cn(variantStyles[variant], className)}
      style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
    >
      {title && (
        <div className="px-4 py-2 border-b border-cyan-dim">
          <span className="text-text-secondary text-sm tracking-widest font-ui font-semibold uppercase">
            {title}
          </span>
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export default Panel;
