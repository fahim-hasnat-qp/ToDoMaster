import { Check } from 'lucide-react';
import { cn } from './utils/cn';

/** Curated palette — distinct, accessible-contrast hues for lists/tags. */
export const SWATCHES: readonly string[] = [
  '#6C8EF5', // blue
  '#9B6EF5', // violet
  '#F45E81', // rose
  '#F5A623', // amber
  '#50C878', // green
  '#2DC58A', // emerald
  '#40C4D0', // cyan
  '#F5716C', // red
  '#B0754C', // brown
  '#8D95A2', // slate
];

export function ColorSwatchPicker({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (color: string) => void }>) {
  return (
    <div className="flex flex-wrap gap-2">
      {SWATCHES.map((color) => {
        const active = color.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            aria-label={`Color ${color}`}
            aria-pressed={active}
            onClick={() => onChange(color)}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full transition-transform',
              active ? 'scale-110' : 'hover:scale-105',
            )}
            style={{
              backgroundColor: color,
              boxShadow: active ? `0 0 0 2px rgb(var(--c-surface)), 0 0 0 4px ${color}` : undefined,
            }}
          >
            {active && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
