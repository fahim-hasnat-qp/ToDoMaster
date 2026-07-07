import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Priority } from '@todomaster/shared';
import { cn } from './utils/cn';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  priority?: Priority;
  label?: string;
  className?: string;
}

const ringByPriority: Record<Priority, string> = {
  [Priority.NONE]: 'border-border',
  [Priority.LOW]: 'border-prio-low',
  [Priority.MEDIUM]: 'border-prio-med',
  [Priority.HIGH]: 'border-prio-high',
};

const fillByPriority: Record<Priority, string> = {
  [Priority.NONE]: 'bg-accent border-accent',
  [Priority.LOW]: 'bg-prio-low border-prio-low',
  [Priority.MEDIUM]: 'bg-prio-med border-prio-med',
  [Priority.HIGH]: 'bg-prio-high border-prio-high',
};

/** Round check with a subtle scale/pop animation on complete. */
export function Checkbox({
  checked,
  onChange,
  priority = Priority.NONE,
  label,
  className,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? 'Toggle complete'}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
        checked ? fillByPriority[priority] : ringByPriority[priority],
        className,
      )}
    >
      <motion.span
        initial={false}
        animate={checked ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      >
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      </motion.span>
    </button>
  );
}
