import React from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-full max-w-md bg-red-50 border border-red-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-red-700">Ein Fehler ist aufgetreten</h2>
          <p className="text-sm text-red-600 font-mono break-all">{error.message}</p>
          {error.stack && (
            <details className="text-xs text-red-400">
              <summary className="cursor-pointer font-medium">Stack Trace</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">{error.stack}</pre>
            </details>
          )}
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          className="px-6 py-3 bg-zinc-900 text-white rounded-2xl text-sm font-medium"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }
}
