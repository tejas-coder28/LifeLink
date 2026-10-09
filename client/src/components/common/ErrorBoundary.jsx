import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary catches any JavaScript render error from any child component
 * and shows a friendly recovery UI instead of a blank/white page.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-surface/40">
          <div className="max-w-md w-full rounded-3xl p-8 text-center space-y-5 glass-modal border border-glass shadow-spatial-overlay">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto bg-brand-500/15 border border-brand-500/30 text-brand-500 shadow-glow-brand">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black font-heading text-primary">
                Something went wrong
              </h2>
              <p className="text-xs leading-relaxed text-secondary">
                A rendering exception occurred. Your data is secure — reload or reset to resume.
              </p>
              {this.state.error && (
                <p className="text-[11px] font-mono px-3 py-2 rounded-xl mt-2 text-left break-all bg-brand-500/10 text-brand-500 border border-brand-500/20">
                  {this.state.error.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-primary text-xs px-4 py-2.5 rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-secondary text-xs px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Full Reload
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
