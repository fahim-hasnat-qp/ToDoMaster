import type { ReactNode } from 'react';

/**
 * Wraps a single form control with its label (implicit association — valid a11y
 * without juggling ids). Use `Fieldset` for groups of buttons/chips.
 */
export function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Labeled group for non-input controls (chip rows, toggles). */
export function Fieldset({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div role="group" aria-label={label} className="space-y-1.5">
      <span className="block text-xs font-medium text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
