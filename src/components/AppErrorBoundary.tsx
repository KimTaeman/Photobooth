import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Photobooth UI failure', {
      name: error.name,
      message: error.message,
      stack: info.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="fatal-error" role="alert">
        <h1>The photobooth needs to restart</h1>
        <p>Your local captures have not been uploaded from this recovery screen.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Restart safely
        </button>
      </main>
    );
  }
}
