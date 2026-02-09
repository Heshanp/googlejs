'use client';

import React, { useEffect } from 'react';
import { create } from 'zustand';
import { cn } from '../../lib/utils';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Convenience hook
export const useToast = () => {
  const addToast = useToastStore((s) => s.addToast);

  // Return stable callbacks without subscribing to toast list changes.
  return React.useMemo(
    () => ({
      toast: (props: Omit<Toast, 'id'>) => addToast(props),
      success: (message: string, title?: string) => addToast({ type: 'success', message, title }),
      error: (message: string, title?: string) => addToast({ type: 'error', message, title }),
      warning: (message: string, title?: string) => addToast({ type: 'warning', message, title }),
      info: (message: string, title?: string) => addToast({ type: 'info', message, title }),
    }),
    [addToast]
  );
};

export const Toaster: React.FC = () => {
  const { toasts, removeToast } = useToastStore();
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed top-4 right-0 left-0 sm:left-auto sm:right-4 z-[100] flex flex-col gap-2 p-4 pointer-events-none sm:max-w-md w-full"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const borders = {
    success: 'border-l-4 border-l-green-500',
    error: 'border-l-4 border-l-red-500',
    warning: 'border-l-4 border-l-yellow-500',
    info: 'border-l-4 border-l-blue-500',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 400 }}
      className={cn(
        "pointer-events-auto flex items-start w-full bg-white dark:bg-neutral-900 shadow-lg rounded-lg border border-app-color p-4",
        borders[toast.type]
      )}
    >
      <div className="shrink-0 mr-3 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1">
        {toast.title && <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{toast.title}</h3>}
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};
