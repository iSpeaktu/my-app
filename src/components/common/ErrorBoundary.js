import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      // Render a friendly fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-white font-bold text-xl mb-2">Something went wrong</h2>
            <p className="text-white/60 mb-4">An unexpected error occurred while loading this view.</p>
            <button onClick={() => this.setState({ hasError: false, error: null })} className="px-4 py-2 bg-[#00F2FF] rounded-lg font-bold text-black">Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
