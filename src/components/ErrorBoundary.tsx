import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReset = () => {
    try {
      localStorage.removeItem('gcal_events');
      localStorage.removeItem('gcal_categories');
      localStorage.removeItem('gcal_active_user');
      localStorage.removeItem('gcal_real_access_token');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#131518] text-gray-100 flex items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-[#1e232b] border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-lg font-bold text-gray-100 mb-2">
              Đã phát hiện sự cố hiển thị giao diện
            </h1>

            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Ứng dụng đã tự động ngăn chặn sự cố. Bạn có thể tải lại trang hoặc khôi phục dữ liệu ban đầu.
            </p>

            {this.state.error && (
              <div className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800 text-[11px] font-mono text-red-300 text-left overflow-x-auto mb-5 max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-2.5 w-full">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Tải lại trang</span>
              </button>

              <button
                onClick={this.handleClearAndReset}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium rounded-xl border border-gray-700 transition-all cursor-pointer"
                title="Khôi phục lại dữ liệu gốc ban đầu"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Khôi phục gốc</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
