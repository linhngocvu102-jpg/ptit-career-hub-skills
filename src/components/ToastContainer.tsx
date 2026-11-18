import React, { useState, useEffect } from 'react';
import { ToastDetail } from '../utils/toast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastDetail[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastDetail>;
      if (!customEvent.detail) return;
      const newToast = customEvent.detail;
      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, newToast.duration || 3500);

      return () => clearTimeout(timer);
    };

    window.addEventListener('ptit_show_toast', handleToastEvent);
    return () => {
      window.removeEventListener('ptit_show_toast', handleToastEvent);
    };
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 sm:top-6 right-4 sm:right-6 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none font-['Plus_Jakarta_Sans',sans-serif]"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success' || !toast.type;
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xl text-slate-800 animate-in fade-in slide-in-from-top-3 duration-200"
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && (
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
              {isWarning && (
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
              {!isSuccess && !isWarning && (
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Info className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
            </div>

            <div className="flex-1 pr-1 text-xs sm:text-sm font-semibold leading-relaxed text-slate-800">
              {toast.message}
            </div>

            <button
              type="button"
              onClick={() => handleDismiss(toast.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
