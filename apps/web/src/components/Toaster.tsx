import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, type Toast } from '@/stores/toast-store';

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card"
    >
      <span className="text-sm text-text">{toast.message}</span>
      {toast.actionLabel && (
        <button
          onClick={() => {
            toast.onAction?.();
            dismiss(toast.id);
          }}
          className="ml-auto text-sm font-semibold text-accent hover:underline"
        >
          {toast.actionLabel}
        </button>
      )}
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      <div className="pointer-events-auto flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
