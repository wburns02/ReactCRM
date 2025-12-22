/**
 * Playbook Types
 *
 * Defines the interface for all healing playbooks.
 */

import { FailureReport, FixClass } from '../triage/types';

export interface PlaybookResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
  duration: number;
}

export interface Playbook {
  // Unique identifier
  name: string;

  // Human-readable description
  description: string;

  // Fix classification
  class: FixClass;

  // Whether this playbook can run automatically
  autoExecute: boolean;

  // Categories this playbook applies to
  applicableCategories: string[];

  // Execute the playbook
  execute(failure: FailureReport, dryRun?: boolean): Promise<PlaybookResult>;

  // Check if playbook is applicable to a failure
  isApplicable(failure: FailureReport): boolean;
}

export interface PlaybookRegistry {
  // Register a playbook
  register(playbook: Playbook): void;

  // Get playbook by name
  get(name: string): Playbook | undefined;

  // Get all playbooks
  getAll(): Playbook[];

  // Get playbooks applicable to a failure
  getApplicable(failure: FailureReport): Playbook[];

  // Get auto-executable playbooks
  getAutoExecutable(): Playbook[];
}

// Base class for playbooks
export abstract class BasePlaybook implements Playbook {
  abstract name: string;
  abstract description: string;
  abstract class: FixClass;
  abstract autoExecute: boolean;
  abstract applicableCategories: string[];

  abstract execute(failure: FailureReport, dryRun?: boolean): Promise<PlaybookResult>;

  isApplicable(failure: FailureReport): boolean {
    return (
      this.applicableCategories.includes(failure.category) ||
      this.applicableCategories.includes('*')
    );
  }

  protected log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }

  protected createResult(
    success: boolean,
    message: string,
    startTime: number,
    details?: Record<string, unknown>
  ): PlaybookResult {
    return {
      success,
      message,
      details,
      duration: Date.now() - startTime,
    };
  }
}
