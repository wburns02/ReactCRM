import { Component, type ReactNode } from "react";
import { Button } from "./ui/Button.tsx";
import { Card } from "./ui/Card.tsx";
import { captureException, addBreadcrumb } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  /** Optional fallback to render on error */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

/**
 * Error boundary for React app
 * Catches React errors, reports to Sentry, and provides recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    console.error("React Error Boundary caught error:", error, errorInfo);

    // Add breadcrumb for context
    addBreadcrumb(
      "React Error Boundary triggered",
      "error",
      { componentStack: errorInfo.componentStack },
      "error",
    );

    // Report to Sentry
    captureException(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Generate error ID for user reference
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
    this.setState({ errorId });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  handleGoToDashboard = () => {
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="max-w-md w-full p-6 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Something went wrong
            </h2>
            <p className="text-text-secondary mb-4">
              The page encountered an error. You can try again or return to the
              dashboard.
            </p>
            {this.state.errorId && (
              <p className="text-xs text-text-muted mb-4">
                Error ID:{" "}
                <code className="bg-bg-muted px-1 rounded">
                  {this.state.errorId}
                </code>
              </p>
            )}
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs bg-bg-muted p-3 rounded mb-4 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry}>Try Again</Button>
              <Button variant="secondary" onClick={this.handleGoToDashboard}>
                Return to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
