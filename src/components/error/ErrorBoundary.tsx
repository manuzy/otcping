import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useState } from 'react';

interface ErrorDetailsSectionProps {
  error: Error;
  errorInfo?: string;
}

function ErrorDetailsSection({ error, errorInfo }: ErrorDetailsSectionProps) {
  const [copied, setCopied] = useState(false);

  const copyErrorDetails = async () => {
    const errorText = `Error: ${error.message}${errorInfo ? `\n\nComponent Stack:\n${errorInfo}` : ''}`;
    
    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium mb-2 flex items-center justify-between">
        Error Details
        <Button
          onClick={copyErrorDetails}
          variant="ghost"
          size="sm"
          className="h-6 px-2"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </summary>
      <div className="bg-muted p-3 rounded text-xs font-mono overflow-auto max-h-32">
        <div className="mb-2">
          <strong>Error:</strong> {error.message}
        </div>
        {errorInfo && (
          <div>
            <strong>Component Stack:</strong>
            <pre className="whitespace-pre-wrap mt-1">
              {errorInfo}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught an error', {
      component: 'ErrorBoundary',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    }, error);

    this.setState({
      error,
      errorInfo: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
                </AlertDescription>
              </Alert>

              {this.props.showDetails && this.state.error && (
                <ErrorDetailsSection error={this.state.error} errorInfo={this.state.errorInfo} />
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleRetry} variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} className="flex-1">
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}