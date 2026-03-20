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

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex-1 flex items-center justify-center min-h-[320px] p-6">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle size={28} className="text-rose-500" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              页面出现错误
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {this.state.error?.message || '发生未知错误，请重新加载页面'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm"
          >
            <RefreshCw size={15} />
            重新加载
          </button>
        </div>
      </div>
    );
  }
}
