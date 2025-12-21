/**
 * Error boundary component for graceful error handling
 * Catches React errors and displays user-friendly fallback UI with retry functionality
 */
import { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="h-5 w-5" />
              {this.props.fallbackTitle || 'Something went wrong'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>Error Details</AlertTitle>
              <AlertDescription className="mt-2 font-mono text-xs break-all">
                {this.state.error?.message || 'An unexpected error occurred'}
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="ghost"
                size="sm"
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
