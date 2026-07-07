import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

export interface Toast {
  id: string;
  message: string;
  /** Optional action button (e.g. "Undo"). */
  actionLabel?: string;
  onAction?: () => void;
  durationMs: number;
}

interface ToastState {
  toasts: Toast[];
  show: (t: Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number }) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (t) => {
    const id = uuid();
    const toast: Toast = { id, durationMs: 4000, ...t };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
