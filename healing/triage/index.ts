/**
 * Triage System
 *
 * Exports all triage functionality for failure classification and analysis.
 */

// Types
export * from './types';

// Patterns
export { KNOWN_PATTERNS, findMatchingPattern, getPatternsByCategory, getAutoFixablePatterns } from './patterns';

// Classifier
export {
  classifyFailure,
  groupFailuresByCategory,
  getAutoFixableFailures,
  prioritizeFailures,
  generateFailureSummary,
} from './classifier';
