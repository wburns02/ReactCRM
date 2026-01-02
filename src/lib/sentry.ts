import * as Sentry from '@sentry/react';

/**
 * Sentry Configuration
 *
 * Initialize Sentry for error tracking and performance monitoring.
 * Only active in production environment.
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const IS_PRODUCTION = import.meta.env.PROD;

/**
 * Initialize Sentry
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    if (IS_PRODUCTION) {
      console.warn('Sentry DSN not configured. Error tracking disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: IS_PRODUCTION ? 'production' : 'development',

    // Performance Monitoring
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session Replay (for debugging user issues)
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || 'unknown',

    // Trace propagation targets for CORS
    tracePropagationTargets: [
      'localhost',
      'react.ecbtx.com',
      'react-crm-api-production.up.railway.app',
    ],

    // Integration options
    integrations: [
      // Browser tracing for performance
      Sentry.browserTracingIntegration(),
      // Replay integration for session recording
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Filter out known non-errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Ignore network errors that are expected (e.g., offline)
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return null;
      }

      // Ignore cancelled requests
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }

      // Ignore ResizeObserver loop errors (browser quirk)
      if (error instanceof Error && error.message?.includes('ResizeObserver')) {
        return null;
      }

      return event;
    },

    // Ignore specific URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^moz-extension:\/\//i,
    ],
  });
}

/**
 * Capture exception with additional context
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message (non-error events)
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
) {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: {
  id: string | number;
  email?: string;
  username?: string;
  role?: string;
} | null) {
  if (user) {
    Sentry.setUser({
      id: String(user.id),
      email: user.email,
      username: user.username,
      // Custom fields
      role: user.role,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
) {
  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

/**
 * Wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactElement
) {
  return Sentry.withErrorBoundary(Component, {
    fallback,
  });
}

/**
 * Error Boundary component
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Profiler for performance tracking
 */
export const SentryProfiler = Sentry.withProfiler;

// Re-export Sentry for advanced usage
export { Sentry };
