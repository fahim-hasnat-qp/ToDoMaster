import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from './utils/cn';

const base =
  'w-full rounded-xl bg-surface-2 border border-border px-3.5 py-2.5 text-sm ' +
  'text-text placeholder:text-muted transition-colors ' +
  'focus:border-accent focus:outline-none';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, 'resize-none', className)} {...props} />
));
Textarea.displayName = 'Textarea';
