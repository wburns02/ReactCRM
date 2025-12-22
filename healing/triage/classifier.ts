/**
 * Failure Classifier
 *
 * Classifies test failures into categories and determines fix strategies.
 */

import { randomUUID } from 'crypto';
import {
  FailureReport,
  FailureCategory,
  Severity,
  FixClass,
  TestResult,
  PlaybookAction,
} from './types';
import { findMatchingPattern, KNOWN_PATTERNS } from './patterns';

/**
 * Classify a test failure into a FailureReport
 */
export function classifyFailure(
  testResult: TestResult,
  projectName: string = 'unknown'
): FailureReport {
  const errorMessage = testResult.error?.message || 'Unknown error';
  const errorStack = testResult.error?.stack;

  // Try to match against known patterns
  const pattern = findMatchingPattern(errorMessage);

  let category: FailureCategory = 'unknown';
  let severity: Severity = 'medium';
  let fixClass: FixClass = 'B';
  let autoFixable = false;
  let suggestedFix: PlaybookAction | undefined;

  if (pattern) {
    category = pattern.category;
    severity = pattern.severity;
    fixClass = pattern.fixClass;
    autoFixable = pattern.fixClass === 'A' && !!pattern.playbook;

    if (pattern.playbook) {
      suggestedFix = {
        name: pattern.playbook,
        class: pattern.fixClass,
        description: pattern.description,
      };
    }
  } else {
    // Fallback heuristic classification
    const classification = heuristicClassify(errorMessage, errorStack);
    category = classification.category;
    severity = classification.severity;
    fixClass = classification.fixClass;
  }

  // Extract artifacts from test result
  const screenshot = testResult.attachments?.find((a) => a.contentType.includes('image'))?.path;
  const trace = testResult.attachments?.find((a) => a.name === 'trace')?.path;
  const video = testResult.attachments?.find((a) => a.contentType.includes('video'))?.path;

  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    testName: testResult.name,
    testFile: testResult.file,
    projectName,

    errorMessage,
    errorStack,

    category,
    severity,
    autoFixable,
    fixClass,

    screenshot,
    trace,
    video,

    patternMatch: pattern,
    suggestedFix,

    fixAttempted: false,
  };
}

/**
 * Heuristic classification when no pattern matches
 */
function heuristicClassify(
  errorMessage: string,
  errorStack?: string
): {
  category: FailureCategory;
  severity: Severity;
  fixClass: FixClass;
} {
  const msg = errorMessage.toLowerCase();
  const stack = (errorStack || '').toLowerCase();

  // Auth-related keywords
  if (
    msg.includes('auth') ||
    msg.includes('login') ||
    msg.includes('session') ||
    msg.includes('token') ||
    msg.includes('401') ||
    msg.includes('403')
  ) {
    return { category: 'auth', severity: 'high', fixClass: 'A' };
  }

  // API-related keywords
  if (
    msg.includes('api') ||
    msg.includes('endpoint') ||
    msg.includes('request') ||
    msg.includes('response') ||
    msg.includes('fetch') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503')
  ) {
    return { category: 'api', severity: 'high', fixClass: 'A' };
  }

  // Network-related keywords
  if (
    msg.includes('network') ||
    msg.includes('connection') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('dns')
  ) {
    return { category: 'network', severity: 'high', fixClass: 'A' };
  }

  // Database-related keywords
  if (
    msg.includes('database') ||
    msg.includes('sql') ||
    msg.includes('postgres') ||
    msg.includes('query') ||
    msg.includes('constraint')
  ) {
    return { category: 'database', severity: 'high', fixClass: 'C' };
  }

  // UI-related (locator, element, selector, visible)
  if (
    msg.includes('locator') ||
    msg.includes('element') ||
    msg.includes('selector') ||
    msg.includes('visible') ||
    msg.includes('click') ||
    stack.includes('playwright')
  ) {
    return { category: 'ui', severity: 'medium', fixClass: 'B' };
  }

  // Default: unknown
  return { category: 'unknown', severity: 'medium', fixClass: 'B' };
}

/**
 * Group failures by category for analysis
 */
export function groupFailuresByCategory(
  failures: FailureReport[]
): Map<FailureCategory, FailureReport[]> {
  const grouped = new Map<FailureCategory, FailureReport[]>();

  for (const failure of failures) {
    const existing = grouped.get(failure.category) || [];
    existing.push(failure);
    grouped.set(failure.category, existing);
  }

  return grouped;
}

/**
 * Get failures eligible for auto-fix
 */
export function getAutoFixableFailures(failures: FailureReport[]): FailureReport[] {
  return failures.filter((f) => f.autoFixable && f.suggestedFix);
}

/**
 * Prioritize failures by severity
 */
export function prioritizeFailures(failures: FailureReport[]): FailureReport[] {
  const severityOrder: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...failures].sort((a, b) => {
    // First by severity
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;

    // Then by auto-fixable (auto-fixable first)
    if (a.autoFixable && !b.autoFixable) return -1;
    if (!a.autoFixable && b.autoFixable) return 1;

    return 0;
  });
}

/**
 * Generate summary statistics for failures
 */
export function generateFailureSummary(failures: FailureReport[]): {
  total: number;
  byCategory: Record<FailureCategory, number>;
  bySeverity: Record<Severity, number>;
  autoFixable: number;
  needsPR: number;
} {
  const byCategory: Record<FailureCategory, number> = {
    auth: 0,
    api: 0,
    ui: 0,
    network: 0,
    database: 0,
    unknown: 0,
  };

  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  let autoFixable = 0;
  let needsPR = 0;

  for (const failure of failures) {
    byCategory[failure.category]++;
    bySeverity[failure.severity]++;

    if (failure.autoFixable) {
      autoFixable++;
    } else {
      needsPR++;
    }
  }

  return {
    total: failures.length,
    byCategory,
    bySeverity,
    autoFixable,
    needsPR,
  };
}
