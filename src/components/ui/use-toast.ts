import { create } from 'zustand';

type Toast = {
  id: string;
  title?: string;
  description: string;
  variant?: 'default' | 'destructive';
};

type ToastStore = {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
};

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  toast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: Math.random().toString(36).substr(2, 9) }],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
