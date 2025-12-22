/**
 * Playbook Registry
 *
 * Central registry for all healing playbooks.
 */

import { Playbook, PlaybookRegistry } from './types';
import { FailureReport } from '../triage/types';

// Safe playbooks (Class A - auto-execute)
import { RestartBackendPlaybook } from './safe/restart-backend';
import { ClearSessionPlaybook } from './safe/clear-session';
import { RefreshTokensPlaybook } from './safe/refresh-tokens';

class PlaybookRegistryImpl implements PlaybookRegistry {
  private playbooks: Map<string, Playbook> = new Map();

  register(playbook: Playbook): void {
    if (this.playbooks.has(playbook.name)) {
      console.warn(`Playbook ${playbook.name} already registered, overwriting`);
    }
    this.playbooks.set(playbook.name, playbook);
  }

  get(name: string): Playbook | undefined {
    return this.playbooks.get(name);
  }

  getAll(): Playbook[] {
    return Array.from(this.playbooks.values());
  }

  getApplicable(failure: FailureReport): Playbook[] {
    return this.getAll().filter((p) => p.isApplicable(failure));
  }

  getAutoExecutable(): Playbook[] {
    return this.getAll().filter((p) => p.autoExecute);
  }

  getByClass(fixClass: 'A' | 'B' | 'C'): Playbook[] {
    return this.getAll().filter((p) => p.class === fixClass);
  }
}

// Singleton registry
const registry = new PlaybookRegistryImpl();

// Register all safe playbooks
function registerSafePlaybooks(projectRoot: string = process.cwd()): void {
  registry.register(new RestartBackendPlaybook());
  registry.register(new ClearSessionPlaybook(projectRoot));
  registry.register(new RefreshTokensPlaybook(projectRoot));
}

// Initialize with default playbooks
registerSafePlaybooks();

export function getPlaybookRegistry(): PlaybookRegistryImpl {
  return registry;
}

export function getPlaybook(name: string): Playbook | undefined {
  return registry.get(name);
}

export function getApplicablePlaybooks(failure: FailureReport): Playbook[] {
  return registry.getApplicable(failure);
}

export function getAutoExecutablePlaybooks(): Playbook[] {
  return registry.getAutoExecutable();
}

// Re-export types
export * from './types';
