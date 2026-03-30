import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const errMsg = this.state.error?.message || '发生未知错误';

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] dark:bg-[#000000]">
        <div className="flex flex-col items-center gap-5 max-w-md text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500" />
          </div>

          <div className="space-y-1.5">
            <p className="text-6xl font-black text-slate-200 dark:text-white/10 tracking-tight">500</p>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">页面出现错误</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{errMsg}</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              重试
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.97] transition-all"
            >
              <RefreshCw size={15} />
              刷新页面
            </button>
          </div>
        </div>
      </div>
    );
  }
}
