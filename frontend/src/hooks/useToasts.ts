import { useState } from 'react';


export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export const TOAST_COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  error: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  info: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
};

let toastId = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000);
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return {
    toasts,
    addToast,
    dismissToast,
  };
}
