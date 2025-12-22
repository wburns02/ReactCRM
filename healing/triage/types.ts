/**
 * Triage System Types
 *
 * Defines all types for failure classification and analysis.
 */

export type FailureCategory = 'auth' | 'api' | 'ui' | 'network' | 'database' | 'unknown';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type FixClass = 'A' | 'B' | 'C';

export interface PlaybookAction {
  name: string;
  class: FixClass;
  description: string;
  params?: Record<string, unknown>;
}

export interface FailureReport {
  id: string;
  timestamp: string;
  testName: string;
  testFile: string;
  projectName: string;

  // Error details
  errorMessage: string;
  errorStack?: string;

  // Classification
  category: FailureCategory;
  severity: Severity;
  autoFixable: boolean;
  fixClass: FixClass;

  // Artifacts
  screenshot?: string; // base64 or path
  trace?: string; // path to trace file
  video?: string; // path to video file

  // Analysis
  patternMatch?: KnownPattern;
  suggestedFix?: PlaybookAction;
  llmAnalysis?: LLMAnalysis;

  // Fix execution
  fixAttempted: boolean;
  fixSuccessful?: boolean;
  fixDetails?: string;
}

export interface KnownPattern {
  id: string;
  name: string;
  description: string;
  regex: RegExp;
  category: FailureCategory;
  severity: Severity;
  fixClass: FixClass;
  playbook?: string;
}

export interface LLMAnalysis {
  provider: 'ollama' | 'anthropic';
  model: string;
  rootCause: string;
  suggestedFix: string;
  confidence: number;
  codeChanges?: CodeChange[];
  additionalNotes?: string;
}

export interface CodeChange {
  file: string;
  description: string;
  before?: string;
  after: string;
  lineNumber?: number;
}

export interface TestResult {
  name: string;
  file: string;
  project: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
  attachments?: Attachment[];
  retries: number;
}

export interface Attachment {
  name: string;
  contentType: string;
  path: string;
}

export interface PlaywrightReport {
  config: {
    projects: { name: string }[];
  };
  suites: TestSuite[];
  stats: {
    expected: number;
    unexpected: number;
    flaky: number;
    skipped: number;
    duration: number;
  };
}

export interface TestSuite {
  title: string;
  file: string;
  specs: TestSpec[];
  suites?: TestSuite[];
}

export interface TestSpec {
  title: string;
  ok: boolean;
  tests: TestCase[];
}

export interface TestCase {
  title: string;
  projectName: string;
  status: 'expected' | 'unexpected' | 'skipped' | 'flaky';
  duration: number;
  results: TestCaseResult[];
}

export interface TestCaseResult {
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
  attachments: Attachment[];
}

export interface HealingRunResult {
  runId: string;
  timestamp: string;
  duration: number;

  // Test summary
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;

  // Failure analysis
  failures: FailureReport[];

  // Fix summary
  fixesAttempted: number;
  fixesSuccessful: number;
  fixesFailed: number;
  prsCreated: string[];

  // LLM usage
  llmProvider: 'ollama' | 'anthropic' | 'none';
  llmCalls: number;

  // Status
  overallStatus: 'healthy' | 'degraded' | 'failing';
}
