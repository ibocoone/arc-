import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { UserProvider } from './contexts/UserContext';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ color: 'white', background: '#0a0a0a', padding: '2rem', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h2 style={{ color: '#ef4444' }}>❌ App Error</h2>
          <pre style={{ color: '#ef4444', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{err.message}</pre>
          <pre style={{ color: '#666', fontSize: '11px', whiteSpace: 'pre-wrap' }}>{err.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <UserProvider>
        <App />
      </UserProvider>
    </ErrorBoundary>
  </StrictMode>,
);
