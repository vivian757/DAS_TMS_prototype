import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
  info: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
    this.setState({ info });
  }
  reset = () => this.setState({ error: null, info: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          padding: 24,
          fontFamily: '"Noto Sans", sans-serif',
          background: '#FFEDEA',
          border: '1px solid #DE3730',
          borderRadius: 8,
          margin: 24,
          maxWidth: 900,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, color: '#BA1A1A', marginBottom: 8 }}>
          ⚠️ 元件 runtime 例外
        </div>
        <div style={{ fontSize: 14, color: '#191C1E', marginBottom: 12, fontWeight: 500 }}>
          {this.state.error.message}
        </div>
        <pre
          style={{
            fontSize: 12,
            background: '#fff',
            padding: 12,
            borderRadius: 4,
            overflow: 'auto',
            maxHeight: 300,
            color: '#454749',
          }}
        >
          {this.state.error.stack}
        </pre>
        {this.state.info?.componentStack && (
          <pre
            style={{
              fontSize: 12,
              background: '#fff',
              padding: 12,
              borderRadius: 4,
              marginTop: 8,
              overflow: 'auto',
              maxHeight: 200,
              color: '#5C5F61',
            }}
          >
            Component stack:{this.state.info.componentStack}
          </pre>
        )}
        <button
          onClick={this.reset}
          style={{
            marginTop: 12,
            padding: '6px 16px',
            background: '#27AAE1',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          重試
        </button>
      </div>
    );
  }
}
