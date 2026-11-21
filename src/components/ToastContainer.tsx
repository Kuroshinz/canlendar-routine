import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X, Volume2, Sparkles } from 'lucide-react';
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
    <div className="fixed top-5 right-5 sm:right-6 z-[999999] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-2xl transition-all duration-300 toast-card-enter ${
              isSuccess
                ? 'bg-gradient-to-r from-[#06241a]/98 via-[#071914]/98 to-[#050f0c]/98 border-emerald-400/50 text-white toast-success-glow'
                : isWarning
                ? 'bg-gradient-to-r from-[#2a1b06]/98 via-[#1f1304]/98 to-[#150d03]/98 border-amber-400/50 text-white shadow-amber-950/40'
                : isError
                ? 'bg-gradient-to-r from-[#2c090e]/98 via-[#1f0509]/98 to-[#150306]/98 border-rose-400/50 text-white shadow-rose-950/40'
                : 'bg-gradient-to-r from-[#0d182e]/98 via-[#091020]/98 to-[#050912]/98 border-blue-400/50 text-white shadow-blue-950/40'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2 rounded-xl shrink-0 relative ${
                  isSuccess
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                    : isError
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                }`}
              >
                {isSuccess && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-300 icon-pop-enter" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  </>
                )}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-300" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-300" />}
                {!isSuccess && !isWarning && !isError && <Info className="w-5 h-5 text-blue-300" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isSuccess
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                        : isError
                        ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-400/40'
                    }`}
                  >
                    {isSuccess ? 'Thành công' : isWarning ? 'Cảnh báo' : isError ? 'Lỗi' : 'Thông tin'}
                  </span>
                  {isSuccess && (
                    <span className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1">
                      <Volume2 className="w-3 h-3 text-emerald-400" />
                      <span>Đã xác nhận</span>
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-extrabold text-white tracking-tight leading-snug">
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-xs text-white/80 mt-1 leading-relaxed break-words font-medium">
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

            {/* Glowing animated progress timeout bar */}
            <div className="mt-3.5 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ease-linear shadow-xs ${
                  isSuccess
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500'
                    : isWarning
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : isError
                    ? 'bg-gradient-to-r from-rose-400 to-red-500'
                    : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                }`}
                style={{
                  animation: `toastProgressShrink ${toast.durationMs}ms linear forwards`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
