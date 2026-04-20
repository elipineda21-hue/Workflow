import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <div className="text-4xl mb-3 opacity-40">⚠️</div>
          <div className="text-navy font-bold text-sm mb-2">Something went wrong</div>
          <div className="text-muted text-xs mb-4">{this.state.error?.message || "An unexpected error occurred"}</div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-accent text-white border-none rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer">
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
