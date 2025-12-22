/**
 * Known Failure Patterns
 *
 * Patterns for automatic classification of test failures.
 * These enable quick triage without LLM analysis for common issues.
 */

import { KnownPattern } from './types';

export const KNOWN_PATTERNS: KnownPattern[] = [
  // ===== AUTH PATTERNS =====
  {
    id: 'auth-session-expired',
    name: 'Session Expired',
    description: 'User session has expired, needs re-authentication',
    regex: /session.*expired|token.*expired|401.*unauthorized|JWT.*expired/i,
    category: 'auth',
    severity: 'high',
    fixClass: 'A',
    playbook: 'refresh-tokens',
  },
  {
    id: 'auth-login-failed',
    name: 'Login Failed',
    description: 'Authentication credentials rejected',
    regex: /login.*failed|invalid.*credentials|incorrect.*password|sign.?in.*failed/i,
    category: 'auth',
    severity: 'critical',
    fixClass: 'B',
  },
  {
    id: 'auth-cors-blocked',
    name: 'CORS Blocked',
    description: 'Cross-origin request blocked by CORS policy',
    regex: /CORS.*blocked|cross.?origin.*blocked|Access-Control-Allow-Origin/i,
    category: 'auth',
    severity: 'high',
    fixClass: 'B',
  },
  {
    id: 'auth-cookie-missing',
    name: 'Missing Cookie',
    description: 'Required authentication cookie not found',
    regex: /cookie.*missing|no.*session.*cookie|authentication.*cookie/i,
    category: 'auth',
    severity: 'high',
    fixClass: 'A',
    playbook: 'clear-session',
  },

  // ===== API PATTERNS =====
  {
    id: 'api-500-error',
    name: 'Server Error (500)',
    description: 'Backend returned internal server error',
    regex: /500.*internal.*server|server.*error.*500|unexpected.*server.*error/i,
    category: 'api',
    severity: 'critical',
    fixClass: 'A',
    playbook: 'restart-backend',
  },
  {
    id: 'api-502-gateway',
    name: 'Bad Gateway (502)',
    description: 'Upstream server unavailable',
    regex: /502.*bad.*gateway|bad.*gateway.*502|upstream.*unavailable/i,
    category: 'api',
    severity: 'critical',
    fixClass: 'A',
    playbook: 'restart-backend',
  },
  {
    id: 'api-503-unavailable',
    name: 'Service Unavailable (503)',
    description: 'Service temporarily unavailable',
    regex: /503.*service.*unavailable|service.*unavailable.*503|temporarily.*unavailable/i,
    category: 'api',
    severity: 'critical',
    fixClass: 'A',
    playbook: 'restart-backend',
  },
  {
    id: 'api-timeout',
    name: 'API Timeout',
    description: 'API request timed out',
    regex: /timeout.*exceeded|request.*timeout|ETIMEDOUT|network.*timeout/i,
    category: 'api',
    severity: 'high',
    fixClass: 'A',
    playbook: 'restart-backend',
  },
  {
    id: 'api-404-not-found',
    name: 'Endpoint Not Found (404)',
    description: 'API endpoint does not exist',
    regex: /404.*not.*found|endpoint.*not.*found|route.*not.*found/i,
    category: 'api',
    severity: 'medium',
    fixClass: 'C',
  },
  {
    id: 'api-422-validation',
    name: 'Validation Error (422)',
    description: 'Request validation failed',
    regex: /422.*validation|validation.*error|unprocessable.*entity/i,
    category: 'api',
    severity: 'medium',
    fixClass: 'B',
  },
  {
    id: 'api-rate-limit',
    name: 'Rate Limited (429)',
    description: 'Too many requests, rate limited',
    regex: /429.*too.*many|rate.*limit.*exceeded|throttled/i,
    category: 'api',
    severity: 'medium',
    fixClass: 'A',
  },

  // ===== NETWORK PATTERNS =====
  {
    id: 'network-refused',
    name: 'Connection Refused',
    description: 'Unable to connect to server',
    regex: /ECONNREFUSED|connection.*refused|ERR_CONNECTION_REFUSED/i,
    category: 'network',
    severity: 'critical',
    fixClass: 'A',
    playbook: 'restart-backend',
  },
  {
    id: 'network-reset',
    name: 'Connection Reset',
    description: 'Connection was reset by server',
    regex: /ECONNRESET|connection.*reset|ERR_CONNECTION_RESET/i,
    category: 'network',
    severity: 'high',
    fixClass: 'A',
    playbook: 'restart-backend',
  },
  {
    id: 'network-dns',
    name: 'DNS Resolution Failed',
    description: 'Unable to resolve hostname',
    regex: /ENOTFOUND|DNS.*failed|getaddrinfo.*ENOTFOUND/i,
    category: 'network',
    severity: 'critical',
    fixClass: 'B',
  },
  {
    id: 'network-ssl',
    name: 'SSL/TLS Error',
    description: 'SSL certificate or handshake error',
    regex: /SSL.*error|certificate.*error|CERT_|ERR_CERT_/i,
    category: 'network',
    severity: 'high',
    fixClass: 'B',
  },

  // ===== UI PATTERNS =====
  {
    id: 'ui-element-not-found',
    name: 'Element Not Found',
    description: 'Expected UI element not present',
    regex: /locator.*resolved.*to.*0|waiting.*for.*selector|element.*not.*found|no.*element.*matching/i,
    category: 'ui',
    severity: 'medium',
    fixClass: 'B',
  },
  {
    id: 'ui-timeout-visible',
    name: 'Element Not Visible',
    description: 'Element exists but not visible within timeout',
    regex: /waiting.*visible|Timeout.*exceeded.*visible|not.*visible.*timeout/i,
    category: 'ui',
    severity: 'medium',
    fixClass: 'B',
  },
  {
    id: 'ui-navigation-failed',
    name: 'Navigation Failed',
    description: 'Page navigation did not complete',
    regex: /navigation.*failed|page.*load.*timeout|waiting.*for.*navigation/i,
    category: 'ui',
    severity: 'high',
    fixClass: 'A',
  },
  {
    id: 'ui-text-mismatch',
    name: 'Text Content Mismatch',
    description: 'Expected text not found on page',
    regex: /Expected.*to.*have.*text|text.*content.*mismatch|expected.*string/i,
    category: 'ui',
    severity: 'low',
    fixClass: 'B',
  },
  {
    id: 'ui-screenshot-diff',
    name: 'Visual Difference',
    description: 'Screenshot comparison failed',
    regex: /screenshot.*differ|visual.*regression|image.*comparison.*failed/i,
    category: 'ui',
    severity: 'low',
    fixClass: 'B',
  },

  // ===== DATABASE PATTERNS =====
  {
    id: 'db-connection-failed',
    name: 'Database Connection Failed',
    description: 'Unable to connect to database',
    regex: /database.*connection|ECONNREFUSED.*5432|postgres.*error|connection.*pool/i,
    category: 'database',
    severity: 'critical',
    fixClass: 'A',
    playbook: 'restart-backend',
  },
  {
    id: 'db-query-error',
    name: 'Database Query Error',
    description: 'SQL query execution failed',
    regex: /SQL.*error|query.*failed|relation.*does.*not.*exist|column.*does.*not.*exist/i,
    category: 'database',
    severity: 'high',
    fixClass: 'C',
  },
  {
    id: 'db-constraint-violation',
    name: 'Constraint Violation',
    description: 'Database constraint violated',
    regex: /unique.*constraint|foreign.*key.*constraint|check.*constraint|duplicate.*key/i,
    category: 'database',
    severity: 'medium',
    fixClass: 'B',
  },
];

/**
 * Find matching pattern for an error message
 */
export function findMatchingPattern(errorMessage: string): KnownPattern | undefined {
  for (const pattern of KNOWN_PATTERNS) {
    if (pattern.regex.test(errorMessage)) {
      return pattern;
    }
  }
  return undefined;
}

/**
 * Get all patterns by category
 */
export function getPatternsByCategory(category: string): KnownPattern[] {
  return KNOWN_PATTERNS.filter((p) => p.category === category);
}

/**
 * Get all auto-fixable patterns (Class A)
 */
export function getAutoFixablePatterns(): KnownPattern[] {
  return KNOWN_PATTERNS.filter((p) => p.fixClass === 'A' && p.playbook);
}
