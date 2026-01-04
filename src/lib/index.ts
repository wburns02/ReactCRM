/**
 * Library utilities module exports
 */

// Utility functions
export { cn, formatDate, formatCurrency } from './utils';

// Feature flags
export { FEATURE_FLAGS } from './feature-flags';

// Sanitization
export { sanitizeHtml, sanitizeText, sanitizeUrl, escapeHtml } from './sanitize';

// Sentry error tracking
export {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  startTransaction,
  withErrorBoundary,
  SentryErrorBoundary,
  SentryProfiler,
  Sentry,
} from './sentry';

// Web Vitals performance monitoring
export {
  initWebVitals,
  getMetrics,
  getMetric,
  generateReport,
  sendMetrics,
  getPerformanceScore,
  passesWebVitals,
  resetMetrics,
  useWebVitals,
  type WebVitalsMetric,
  type PerformanceBudget,
  type WebVitalsReport,
  type WebVitalsOptions,
} from './webVitals';

// Push notifications
export {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  showLocalNotification,
  getDeviceName,
} from './push-notifications';
