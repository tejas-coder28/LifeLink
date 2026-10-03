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
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ background: 'var(--surface-950)' }}
        >
          <div
            className="max-w-md w-full rounded-3xl p-8 text-center space-y-5"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)' }}
            >
              <AlertTriangle className="w-7 h-7" style={{ color: '#fb7185' }} />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black font-heading" style={{ color: 'var(--text-primary)' }}>
                Something went wrong
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                A rendering error occurred. Your data is safe — just reload the page to continue.
              </p>
              {this.state.error && (
                <p className="text-[11px] font-mono px-3 py-2 rounded-xl mt-2 text-left break-all"
                  style={{ background: 'rgba(220,38,38,0.06)', color: '#f87171', border: '1px solid rgba(220,38,38,0.15)' }}>
                  {this.state.error.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-center pt-1">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: 'rgba(220,38,38,0.15)',
                  color: '#fb7185',
                  border: '1px solid rgba(220,38,38,0.30)',
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-secondary)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
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
