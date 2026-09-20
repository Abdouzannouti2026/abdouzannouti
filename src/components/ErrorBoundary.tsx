
import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle size={40} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900"><span>Oups ! Quelque chose s'est mal passé</span></h1>
              <p className="text-slate-500 text-sm">
                <span>Une erreur inattendue est survenue. Veuillez rafraîchir la page ou réessayer plus tard.</span>
              </p>
            </div>

            {this.state.error && (
              <div className="bg-red-50 rounded-xl p-4 text-left overflow-hidden">
                <p className="text-xs font-mono text-red-700 break-words">
                  <span>{this.state.error.toString()}</span>
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
              >
                <RefreshCw size={18} />
                <span>Actualiser la page</span>
              </button>

              <button
                onClick={this.handleClearCache}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-95"
              >
                <span>Effacer le cache et recharger</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
