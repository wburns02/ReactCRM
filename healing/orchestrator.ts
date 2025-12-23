/**
 * Healing Orchestrator
 *
 * Main entry point for the self-healing system.
 * Coordinates test execution, failure triage, LLM analysis, and fix execution.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

import config, { validateEnvironment } from './healing.config';
import {
  FailureReport,
  TestResult,
  HealingRunResult,
  PlaywrightReport,
  TestSuite,
  TestCase,
} from './triage/types';
import {
  classifyFailure,
  prioritizeFailures,
  getAutoFixableFailures,
  generateFailureSummary,
} from './triage/classifier';
import { getLLMManager, LLMProvider } from './llm';
import { getPlaybookRegistry, Playbook, PlaybookResult } from './playbooks';
import { createPRCreatorFromEnv, GitHubPRCreator } from './github-pr';

const execAsync = promisify(exec);

export interface OrchestratorOptions {
  dryRun?: boolean;
  projects?: string[];
  maxAutoFixes?: number;
  skipLLM?: boolean;
  verbose?: boolean;
}

export class HealingOrchestrator {
  private runId: string;
  private startTime: number;
  private projectRoot: string;
  private options: OrchestratorOptions;
  private results: HealingRunResult;

  constructor(projectRoot: string = process.cwd(), options: OrchestratorOptions = {}) {
    this.runId = randomUUID().slice(0, 8);
    this.startTime = Date.now();
    this.projectRoot = projectRoot;
    this.options = {
      dryRun: config.autoFix.dryRun,
      projects: config.tests.projects,
      maxAutoFixes: config.autoFix.maxPerRun,
      skipLLM: false,
      verbose: false,
      ...options,
    };

    this.results = this.initializeResults();
  }

  private initializeResults(): HealingRunResult {
    return {
      runId: this.runId,
      timestamp: new Date().toISOString(),
      duration: 0,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      testsSkipped: 0,
      failures: [],
      fixesAttempted: 0,
      fixesSuccessful: 0,
      fixesFailed: 0,
      prsCreated: [],
      llmProvider: 'none',
      llmCalls: 0,
      overallStatus: 'healthy',
    };
  }

  /**
   * Run the full healing workflow
   */
  async run(): Promise<HealingRunResult> {
    console.log('='.repeat(60));
    console.log(`HEALING RUN ${this.runId}`);
    console.log(`Started: ${new Date().toISOString()}`);
    console.log(`Dry Run: ${this.options.dryRun}`);
    console.log('='.repeat(60));

    // Validate environment
    const envCheck = validateEnvironment();
    if (!envCheck.valid) {
      console.error('Environment validation failed:', envCheck.missing);
      this.results.overallStatus = 'failing';
      return this.finalize();
    }

    try {
      // Step 1: Run Playwright tests
      console.log('\n[1/5] Running Playwright tests...');
      const testResults = await this.runPlaywrightTests();

      // Step 2: Parse and classify failures
      console.log('\n[2/5] Classifying failures...');
      const failures = await this.classifyTestResults(testResults);
      this.results.failures = failures;

      if (failures.length === 0) {
        console.log('All tests passed!');
        this.results.overallStatus = 'healthy';
        return this.finalize();
      }

      console.log(`Found ${failures.length} failures`);
      const summary = generateFailureSummary(failures);
      console.log(`  Critical: ${summary.bySeverity.critical}`);
      console.log(`  High: ${summary.bySeverity.high}`);
      console.log(`  Auto-fixable: ${summary.autoFixable}`);

      // Step 3: LLM analysis (if enabled)
      if (!this.options.skipLLM) {
        console.log('\n[3/5] Running LLM analysis...');
        await this.runLLMAnalysis(failures);
      } else {
        console.log('\n[3/5] LLM analysis skipped');
      }

      // Step 4: Execute auto-fixes
      console.log('\n[4/5] Executing auto-fixes...');
      await this.executeAutoFixes(failures);

      // Step 5: Create PRs for non-auto-fixable issues
      console.log('\n[5/5] Creating PRs for remaining issues...');
      await this.createPRsForRemainingIssues(failures);

      // Determine overall status
      this.results.overallStatus = this.determineOverallStatus();
    } catch (error) {
      console.error('Orchestrator error:', error);
      this.results.overallStatus = 'failing';
    }

    return this.finalize();
  }

  /**
   * Run Playwright tests and return results
   */
  private async runPlaywrightTests(): Promise<TestResult[]> {
    const projects = this.options.projects || config.tests.projects;
    const projectArgs = projects.map((p) => `--project=${p}`).join(' ');

    const command = `npx playwright test ${projectArgs} --reporter=json`;

    console.log(`Running: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        timeout: config.tests.timeout * projects.length * 10, // Generous timeout
        env: process.env,
      });

      // Parse JSON report
      return this.parsePlaywrightOutput(stdout);
    } catch (error) {
      // Playwright exits with non-zero when tests fail - this is expected
      const execError = error as { stdout?: string; stderr?: string };
      if (execError.stdout) {
        return this.parsePlaywrightOutput(execError.stdout);
      }

      // Try to read from results file
      try {
        const resultsPath = join(this.projectRoot, 'test-results', 'results.json');
        const resultsJson = await readFile(resultsPath, 'utf-8');
        return this.parsePlaywrightOutput(resultsJson);
      } catch {
        console.error('Failed to parse test results');
        return [];
      }
    }
  }

  /**
   * Parse Playwright JSON output into TestResults
   */
  private parsePlaywrightOutput(output: string): TestResult[] {
    const results: TestResult[] = [];

    try {
      const report = JSON.parse(output) as PlaywrightReport;

      // Update stats
      this.results.testsRun = report.stats.expected + report.stats.unexpected + report.stats.skipped;
      this.results.testsPassed = report.stats.expected;
      this.results.testsFailed = report.stats.unexpected;
      this.results.testsSkipped = report.stats.skipped;

      // Extract test results from suites
      this.extractTestResults(report.suites, results);
    } catch {
      console.error('Failed to parse Playwright JSON output');
    }

    return results;
  }

  /**
   * Recursively extract test results from suites
   */
  private extractTestResults(suites: TestSuite[], results: TestResult[]): void {
    for (const suite of suites) {
      for (const spec of suite.specs) {
        for (const test of spec.tests) {
          const lastResult = test.results[test.results.length - 1];

          results.push({
            name: `${suite.title} > ${spec.title} > ${test.title}`,
            file: suite.file,
            project: test.projectName,
            status: lastResult.status,
            duration: lastResult.duration,
            error: lastResult.error,
            attachments: lastResult.attachments,
            retries: test.results.length - 1,
          });
        }
      }

      // Recurse into nested suites
      if (suite.suites) {
        this.extractTestResults(suite.suites, results);
      }
    }
  }

  /**
   * Classify test results into FailureReports
   */
  private async classifyTestResults(testResults: TestResult[]): Promise<FailureReport[]> {
    const failures: FailureReport[] = [];

    for (const result of testResults) {
      if (result.status === 'failed' || result.status === 'timedOut') {
        const report = classifyFailure(result, result.project);
        failures.push(report);
      }
    }

    // Prioritize by severity
    return prioritizeFailures(failures);
  }

  /**
   * Run LLM analysis on failures
   */
  private async runLLMAnalysis(failures: FailureReport[]): Promise<void> {
    const llm = getLLMManager();

    // Initialize LLM (detects GPU/Ollama)
    await llm.initialize();
    this.results.llmProvider = llm.getProvider();

    if (!llm.isAvailable()) {
      console.log('No LLM available, skipping analysis');
      return;
    }

    console.log(`Using LLM provider: ${this.results.llmProvider}`);

    // Analyze failures that need LLM help (no pattern match or low confidence)
    for (const failure of failures) {
      if (!failure.patternMatch) {
        console.log(`  Analyzing: ${failure.testName}`);
        const analysis = await llm.analyzeFailure(failure);

        if (analysis) {
          failure.llmAnalysis = analysis;
          this.results.llmCalls++;
        }
      }
    }

    console.log(`LLM calls made: ${this.results.llmCalls}`);
  }

  /**
   * Execute auto-fixes for eligible failures
   */
  private async executeAutoFixes(failures: FailureReport[]): Promise<void> {
    if (!config.autoFix.enabled) {
      console.log('Auto-fix disabled');
      return;
    }

    const autoFixable = getAutoFixableFailures(failures);
    const maxFixes = this.options.maxAutoFixes || config.autoFix.maxPerRun;
    const toFix = autoFixable.slice(0, maxFixes);

    console.log(`Auto-fixable failures: ${autoFixable.length}, executing up to ${maxFixes}`);

    const registry = getPlaybookRegistry();

    for (const failure of toFix) {
      if (!failure.suggestedFix) continue;

      const playbook = registry.get(failure.suggestedFix.name);
      if (!playbook) {
        console.log(`  Playbook not found: ${failure.suggestedFix.name}`);
        continue;
      }

      console.log(`  Executing playbook: ${playbook.name}`);
      this.results.fixesAttempted++;

      try {
        const result = await playbook.execute(failure, this.options.dryRun);

        failure.fixAttempted = true;
        failure.fixSuccessful = result.success;
        failure.fixDetails = result.message;

        if (result.success) {
          this.results.fixesSuccessful++;
          console.log(`    Success: ${result.message}`);
        } else {
          this.results.fixesFailed++;
          console.log(`    Failed: ${result.message}`);
        }
      } catch (error) {
        this.results.fixesFailed++;
        console.log(`    Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Create PRs for issues that require human review
   */
  private async createPRsForRemainingIssues(failures: FailureReport[]): Promise<void> {
    const needsPR = failures.filter(
      (f) => !f.autoFixable || (f.fixAttempted && !f.fixSuccessful)
    );

    if (needsPR.length === 0) {
      console.log('No issues require PRs');
      return;
    }

    // Skip PR creation in dry-run mode
    if (this.options.dryRun) {
      console.log(`${needsPR.length} issues would require PRs (dry-run mode, skipping)`);
      return;
    }

    // Initialize GitHub PR creator
    const prCreator = createPRCreatorFromEnv();

    if (!prCreator) {
      console.log(`${needsPR.length} issues require PRs but GitHub not configured`);
      console.log('  Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO to enable PR creation');
      return;
    }

    console.log(`Creating PRs for ${needsPR.length} issues...`);

    for (const failure of needsPR) {
      console.log(`  Creating PR for: ${failure.testName}`);

      const result = await prCreator.createPRForFailure(failure);

      if (result.success) {
        console.log(`    Created PR #${result.prNumber}: ${result.prUrl}`);
        this.results.prsCreated.push(result.prUrl!);
      } else {
        console.log(`    Failed to create PR: ${result.error}`);
      }
    }

    console.log(`PRs created: ${this.results.prsCreated.length}/${needsPR.length}`);
  }

  /**
   * Determine overall status based on results
   */
  private determineOverallStatus(): 'healthy' | 'degraded' | 'failing' {
    if (this.results.testsFailed === 0) {
      return 'healthy';
    }

    // Check if critical failures remain unfixed
    const unfixedCritical = this.results.failures.filter(
      (f) => f.severity === 'critical' && !f.fixSuccessful
    );

    if (unfixedCritical.length > 0) {
      return 'failing';
    }

    // Some failures but no critical issues
    return 'degraded';
  }

  /**
   * Finalize and save results
   */
  private async finalize(): Promise<HealingRunResult> {
    this.results.duration = Date.now() - this.startTime;

    // Save results to file
    try {
      const outputDir = join(this.projectRoot, 'healing-results');
      await mkdir(outputDir, { recursive: true });

      const outputPath = join(outputDir, `run-${this.runId}.json`);
      await writeFile(outputPath, JSON.stringify(this.results, null, 2));
      console.log(`\nResults saved to: ${outputPath}`);
    } catch (error) {
      console.error('Failed to save results:', error);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('HEALING RUN SUMMARY');
    console.log('='.repeat(60));
    console.log(`Run ID: ${this.results.runId}`);
    console.log(`Duration: ${(this.results.duration / 1000).toFixed(2)}s`);
    console.log(`Status: ${this.results.overallStatus.toUpperCase()}`);
    console.log(`Tests: ${this.results.testsPassed}/${this.results.testsRun} passed`);
    console.log(`Failures: ${this.results.testsFailed}`);
    console.log(`Fixes: ${this.results.fixesSuccessful}/${this.results.fixesAttempted} successful`);
    console.log(`LLM: ${this.results.llmProvider} (${this.results.llmCalls} calls)`);
    console.log('='.repeat(60));

    return this.results;
  }
}

// CLI entry point
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options: OrchestratorOptions = {
    dryRun: args.includes('--dry-run'),
    skipLLM: args.includes('--skip-llm'),
    verbose: args.includes('--verbose'),
  };

  // Parse --projects
  const projectsArg = args.find((a) => a.startsWith('--projects='));
  if (projectsArg) {
    options.projects = projectsArg.split('=')[1].split(',');
  }

  const orchestrator = new HealingOrchestrator(process.cwd(), options);
  const results = await orchestrator.run();

  // Exit with appropriate code
  process.exit(results.overallStatus === 'failing' ? 1 : 0);
}

// Run when this file is executed directly
const isMain = process.argv[1]?.includes('orchestrator');
if (isMain) {
  main().catch(console.error);
}

export default HealingOrchestrator;
