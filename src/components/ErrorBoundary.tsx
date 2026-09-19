import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('Uncaught error in React Component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-4 select-none font-nunito">
          <div className="w-full max-w-md bg-white rounded-3xl border-2 border-duoGray-border border-b-[6px] p-6 text-center shadow-xl animate-in zoom-in-95 duration-150">
            {/* Warning Mascot Icon */}
            <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-200 border-b-[4px] border-b-rose-400 flex items-center justify-center mx-auto mb-4 text-rose-500 shadow-xs">
              <AlertTriangle size={32} className="stroke-[2.5]" />
            </div>

            <h2 className="font-feather font-black text-xl text-duoGray-charcoal mb-1.5">
              Ups, něco se pokazilo!
            </h2>

            <p className="text-xs text-duoGray-pencil font-bold mb-4 leading-relaxed">
              Nastala nečekaná chyba v aplikaci. Tvá data a zápisky v zařízení jsou v bezpečí.
            </p>

            {this.state.error && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 mb-5 text-left font-mono text-[11px] text-duoGray-charcoal max-h-24 overflow-y-auto break-all">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={this.handleReload}
                className="w-full duo-btn duo-btn-green py-3 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw size={15} />
                <span>Obnovit aplikaci</span>
              </button>

              <button
                onClick={this.handleReset}
                className="w-full duo-btn duo-btn-white py-2.5 px-4 text-xs font-feather font-black text-duoGray-charcoal border-2 border-duoGray-border flex items-center justify-center gap-2 hover:bg-gray-50 cursor-pointer"
              >
                <Home size={15} />
                <span>Zkusit znovu pokračovat</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
