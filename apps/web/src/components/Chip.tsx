import type { ReactNode } from 'react';
import { cn } from './utils/cn';

interface ChipProps {
  children: ReactNode;
  color?: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

/** Small pill for tags, filters, priority markers. */
export function Chip({ children, color, onClick, active, className }: ChipProps) {
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        'border transition-colors',
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border bg-surface-2 text-muted hover:text-text',
        className,
      )}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
      {children}
    </Comp>
  );
}
