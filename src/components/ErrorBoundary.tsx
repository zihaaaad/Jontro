import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Note: consumers should pass a `key` prop that changes with the active tab
// (see App.tsx) so React fully remounts this boundary - and clears the
// error - when the user navigates to a different tool.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Jontro tool crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center justify-center mb-4">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <h3 className="text-base font-medium text-zinc-900 dark:text-[#ededed] mb-1.5">This tool hit an unexpected error</h3>
          <p className="text-sm text-zinc-500 dark:text-[#838383] max-w-sm mb-6">
            {this.state.error.message || 'An unknown error occurred while rendering this tool.'}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 rounded-md text-sm font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e] flex items-center"
          >
            <RotateCcw size={14} className="mr-2" /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
