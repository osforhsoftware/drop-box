import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="glass max-w-md w-full p-6 rounded-2xl border border-white/10 space-y-4">
            <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
            <p className="text-sm text-white/60">
              We encountered an unexpected error while loading this page.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="btn-primary text-sm px-4 py-2"
              >
                Reload page
              </button>
              <a href="/" className="btn-secondary text-sm px-4 py-2">
                Back to home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
