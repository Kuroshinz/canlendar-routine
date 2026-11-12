import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { ToastItem } from '../utils/notify';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (!customEvent.detail) return;

      const newToast = customEvent.detail;
      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep at most 5 toasts visible

      // Auto dismiss
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, newToast.durationMs);
    };

    window.addEventListener('app:toast', handleToastEvent);
    return () => {
      window.removeEventListener('app:toast', handleToastEvent);
    };
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
              isSuccess
                ? 'bg-[#0c1524]/95 border-emerald-500/40 shadow-emerald-950/30'
                : isWarning
                ? 'bg-[#1c1409]/95 border-amber-500/40 shadow-amber-950/30'
                : isError
                ? 'bg-[#1f0d11]/95 border-rose-500/40 shadow-rose-950/30'
                : 'bg-[#0f172a]/95 border-blue-500/40 shadow-blue-950/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-1.5 rounded-xl shrink-0 ${
                  isSuccess
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-400'
                    : isError
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {isSuccess && <CheckCircle2 className="w-5 h-5" />}
                {isWarning && <AlertTriangle className="w-5 h-5" />}
                {isError && <AlertCircle className="w-5 h-5" />}
                {!isSuccess && !isWarning && !isError && <Info className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-xs text-white/75 mt-0.5 leading-relaxed break-words">
                    {toast.message}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleDismiss(toast.id)}
                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subtle animated timeout indicator bar */}
            <div className="mt-3 w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ease-linear ${
                  isSuccess
                    ? 'bg-linear-to-r from-emerald-500 to-teal-400'
                    : isWarning
                    ? 'bg-linear-to-r from-amber-500 to-orange-400'
                    : isError
                    ? 'bg-linear-to-r from-rose-500 to-red-400'
                    : 'bg-linear-to-r from-blue-500 to-indigo-400'
                }`}
                style={{
                  animation: `shrinkWidth ${toast.durationMs}ms linear forwards`,
                }}
              />
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
