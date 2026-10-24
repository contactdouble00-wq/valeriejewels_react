import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const title = this.props.title || 'Something went wrong';
      const defaultMsg = this.props.isCheckout
        ? 'There was an issue opening the checkout. Please try again.'
        : 'An unexpected application error occurred. Please click Try Again or reload the page.';
      const message = this.props.message || defaultMsg;

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full text-center space-y-4 shadow-2xl border border-brand-border/60 text-brand-tertiary">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center text-2xl font-bold shadow-inner">
              !
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-serif font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{message}</p>
            </div>

            {/* Collapsible diagnostic details */}
            {this.state.error && (
              <details className="text-left bg-[#FAF8FC] p-3 rounded-2xl border border-brand-border/80 text-[11px] text-gray-700 max-h-36 overflow-y-auto">
                <summary className="cursor-pointer font-bold text-gray-800 hover:text-brand-primary">
                  Technical Diagnostics ({this.state.error.name || 'Error'})
                </summary>
                <div className="mt-1.5 font-mono text-[10px] break-words whitespace-pre-wrap text-rose-600 bg-white p-2 rounded-xl border border-rose-100">
                  {this.state.error.message || String(this.state.error)}
                </div>
              </details>
            )}

            <div className="flex items-center space-x-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  if (this.props.onReset) this.props.onReset();
                  else window.location.reload();
                }}
                className="flex-1 py-2.5 sm:py-3 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
              >
                Try Again
              </button>
              {this.props.onReturnToStore && (
                <button
                  type="button"
                  onClick={this.props.onReturnToStore}
                  className="px-4 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl cursor-pointer transition-all"
                >
                  Storefront
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}