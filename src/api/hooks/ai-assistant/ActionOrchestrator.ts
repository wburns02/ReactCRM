/**
 * Action Orchestrator
 *
 * Manages execution of AI-suggested actions with validation, permissions,
 * rollback capabilities, and audit trails
 */

import { apiClient } from '../../client';
import type {
  AIAction,
  ActionResult,
  AIContext,
  EntityReference
} from '@/api/types/aiAssistant';

export class ActionOrchestrator {
  private executionHistory: Map<string, ActionResult> = new Map();
  private rollbackData: Map<string, unknown> = new Map();

  // ===== MAIN EXECUTION METHODS =====

  async executeAction(action: AIAction, context: AIContext): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      // Step 1: Validate action
      const validationResult = await this.validateAction(action, context);
      if (!validationResult.valid) {
        return this.createFailureResult(action, 'Validation failed', startTime, validationResult.errors);
      }

      // Step 2: Check permissions
      const permissionResult = await this.checkPermissions(action, context);
      if (!permissionResult.allowed) {
        return this.createFailureResult(action, 'Permission denied', startTime, [permissionResult.reason || 'No permission']);
      }

      // Step 3: Prepare rollback data
      const rollbackData = await this.prepareRollback(action, context);
      this.rollbackData.set(action.id, rollbackData);

      // Step 4: Execute the action
      const result = await this.performAction(action, context);

      // Step 5: Create success result
      const actionResult = this.createSuccessResult(action, result, startTime);

      // Step 6: Store in history
      this.executionHistory.set(action.id, actionResult);

      // Step 7: Log execution for audit
      await this.logActionExecution(action, actionResult, context);

      return actionResult;

    } catch (error) {
      const actionResult = this.createFailureResult(
        action,
        error instanceof Error ? error.message : 'Unknown execution error',
        startTime
      );

      this.executionHistory.set(action.id, actionResult);
      await this.logActionExecution(action, actionResult, context);

      return actionResult;
    }
  }

  async rollbackAction(actionId: string): Promise<ActionResult> {
    const originalResult = this.executionHistory.get(actionId);
    if (!originalResult) {
      throw new Error(`No execution history found for action: ${actionId}`);
    }

    if (!originalResult.rollbackAvailable) {
      throw new Error(`Rollback not available for action: ${actionId}`);
    }

    const rollbackData = this.rollbackData.get(actionId);
    if (!rollbackData) {
      throw new Error(`No rollback data found for action: ${actionId}`);
    }

    const startTime = Date.now();

    try {
      const rollbackResult = await this.performRollback(actionId, rollbackData);

      const result: ActionResult = {
        actionId,
        success: true,
        result: rollbackResult,
        duration: Date.now() - startTime,
        affectedEntities: originalResult.affectedEntities,
        rollbackAvailable: false
      };

      // Update original result
      originalResult.rollbackAvailable = false;
      this.executionHistory.set(actionId, originalResult);

      return result;

    } catch (error) {
      throw new Error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== ACTION VALIDATION =====

  private async validateAction(action: AIAction, context: AIContext): Promise<ValidationResult> {
    const errors: string[] = [];

    // Basic validation
    if (!action.domain) {
      errors.push('Action domain is required');
    }

    if (!action.operation) {
      errors.push('Action operation is required');
    }

    if (!action.payload) {
      errors.push('Action payload is required');
    }

    // Confidence validation
    if (action.confidence < 0.5) {
      errors.push(`Action confidence too low: ${action.confidence}`);
    }

    // Requirements validation
    for (const requirement of action.requirements) {
      if (!requirement.satisfied) {
        errors.push(`Requirement not satisfied: ${requirement.description}`);
      }
    }

    // Domain-specific validation
    const domainValidation = await this.validateDomainAction(action, context);
    errors.push(...domainValidation.errors);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async validateDomainAction(action: AIAction, context: AIContext): Promise<{ errors: string[] }> {
    const errors: string[] = [];

    switch (action.domain) {
      case 'dispatch':
        errors.push(...await this.validateDispatchAction(action, context));
        break;
      case 'scheduling':
        errors.push(...await this.validateSchedulingAction(action, context));
        break;
      case 'tickets':
        errors.push(...await this.validateTicketAction(action, context));
        break;
      // Add more domain-specific validations
    }

    return { errors };
  }

  private async validateDispatchAction(action: AIAction, _context: AIContext): Promise<string[]> {
    const errors: string[] = [];

    if (action.operation === 'assign_technician') {
      const { workOrderId, technicianId } = action.payload as any;

      if (!workOrderId) {
        errors.push('Work order ID required for technician assignment');
      }

      if (!technicianId) {
        errors.push('Technician ID required for assignment');
      }

      // Check if technician is available
      if (technicianId) {
        const isAvailable = await this.checkTechnicianAvailability(technicianId);
        if (!isAvailable) {
          errors.push(`Technician ${technicianId} is not available`);
        }
      }
    }

    return errors;
  }

  private async validateSchedulingAction(action: AIAction, _context: AIContext): Promise<string[]> {
    const errors: string[] = [];

    if (action.operation === 'schedule_job') {
      const { date, time, duration } = action.payload as any;

      if (!date || !time) {
        errors.push('Date and time required for scheduling');
      }

      // Check for scheduling conflicts
      if (date && time) {
        const hasConflict = await this.checkScheduleConflict(date, time, duration);
        if (hasConflict) {
          errors.push(`Schedule conflict detected for ${date} at ${time}`);
        }
      }
    }

    return errors;
  }

  private async validateTicketAction(action: AIAction, _context: AIContext): Promise<string[]> {
    const errors: string[] = [];

    if (action.operation === 'create_ticket') {
      const { customerId, description } = action.payload as any;

      if (!customerId) {
        errors.push('Customer ID required for ticket creation');
      }

      if (!description || description.trim().length < 10) {
        errors.push('Ticket description must be at least 10 characters');
      }
    }

    return errors;
  }

  // ===== PERMISSION CHECKING =====

  private async checkPermissions(action: AIAction, context: AIContext): Promise<{ allowed: boolean; reason?: string }> {
    const userRole = context.user.role;
    const userPermissions = context.user.permissions;

    // Check role-based permissions
    const rolePermissions = this.getRolePermissions(userRole);
    const requiredPermission = this.getRequiredPermission(action);

    if (!rolePermissions.includes(requiredPermission) && !userPermissions.includes(requiredPermission)) {
      return {
        allowed: false,
        reason: `User does not have permission: ${requiredPermission}`
      };
    }

    // Check domain-specific permissions
    const domainPermissionCheck = await this.checkDomainPermissions(action, context);
    if (!domainPermissionCheck.allowed) {
      return domainPermissionCheck;
    }

    // Check business rules
    const businessRuleCheck = await this.checkBusinessRules(action, context);
    if (!businessRuleCheck.allowed) {
      return businessRuleCheck;
    }

    return { allowed: true };
  }

  private getRolePermissions(role: string): string[] {
    const rolePermissionMap: Record<string, string[]> = {
      'administrator': ['*'], // All permissions
      'manager': [
        'read:*',
        'write:customers',
        'write:tickets',
        'write:workorders',
        'execute:ai_actions',
        'schedule:*'
      ],
      'technician': [
        'read:assigned_jobs',
        'write:job_status',
        'write:time_tracking',
        'read:customer_contact'
      ],
      'phone_agent': [
        'read:customers',
        'write:tickets',
        'write:customer_communication',
        'schedule:appointments'
      ],
      'dispatcher': [
        'read:*',
        'write:schedules',
        'write:technician_assignments',
        'execute:dispatch_actions'
      ]
    };

    return rolePermissionMap[role] || [];
  }

  private getRequiredPermission(action: AIAction): string {
    const operationPermissionMap: Record<string, string> = {
      'create': `write:${action.domain}`,
      'update': `write:${action.domain}`,
      'delete': `delete:${action.domain}`,
      'schedule': `schedule:${action.domain}`,
      'assign': `assign:${action.domain}`
    };

    return operationPermissionMap[action.type] || `execute:${action.domain}`;
  }

  private async checkDomainPermissions(action: AIAction, context: AIContext): Promise<{ allowed: boolean; reason?: string }> {
    // Domain-specific permission checks
    switch (action.domain) {
      case 'payments':
        if (action.operation === 'process_payment' && context.user.role !== 'administrator') {
          const amount = (action.payload as any).amount;
          if (amount > 1000) {
            return {
              allowed: false,
              reason: 'Payment amounts over $1000 require administrator approval'
            };
          }
        }
        break;

      case 'scheduling':
        if (action.operation === 'emergency_reschedule' && context.user.role === 'technician') {
          return {
            allowed: false,
            reason: 'Emergency rescheduling requires dispatcher or manager approval'
          };
        }
        break;
    }

    return { allowed: true };
  }

  private async checkBusinessRules(action: AIAction, context: AIContext): Promise<{ allowed: boolean; reason?: string }> {
    // Check business-specific rules
    if (action.domain === 'scheduling' && action.operation === 'schedule_job') {
      const { date } = action.payload as any;
      const scheduleDate = new Date(date);
      const today = new Date();

      // Can't schedule in the past
      if (scheduleDate < today) {
        return {
          allowed: false,
          reason: 'Cannot schedule jobs in the past'
        };
      }

      // Can't schedule more than 30 days in advance without approval
      const daysDifference = (scheduleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDifference > 30 && context.user.role !== 'manager') {
        return {
          allowed: false,
          reason: 'Jobs more than 30 days in advance require manager approval'
        };
      }
    }

    return { allowed: true };
  }

  // ===== ACTION EXECUTION =====

  private async performAction(action: AIAction, context: AIContext): Promise<unknown> {
    switch (action.domain) {
      case 'dispatch':
        return this.executeDispatchAction(action, context);
      case 'scheduling':
        return this.executeSchedulingAction(action, context);
      case 'tickets':
        return this.executeTicketAction(action, context);
      case 'customer-activity':
        return this.executeCustomerAction(action, context);
      default:
        throw new Error(`Unsupported action domain: ${action.domain}`);
    }
  }

  private async executeDispatchAction(action: AIAction, _context: AIContext): Promise<unknown> {
    switch (action.operation) {
      case 'assign_technician':
        const { workOrderId, technicianId } = action.payload as any;
        return apiClient.patch(`/work-orders/${workOrderId}`, {
          assigned_technician_id: technicianId,
          status: 'assigned'
        });

      case 'auto_schedule':
        return apiClient.post('/dispatch/auto-schedule', action.payload);

      default:
        throw new Error(`Unsupported dispatch operation: ${action.operation}`);
    }
  }

  private async executeSchedulingAction(action: AIAction, _context: AIContext): Promise<unknown> {
    switch (action.operation) {
      case 'schedule_job':
        return apiClient.post('/schedule/jobs', action.payload);

      case 'reschedule_job':
        const { jobId, newDateTime } = action.payload as any;
        return apiClient.patch(`/schedule/jobs/${jobId}`, {
          scheduled_date: newDateTime
        });

      default:
        throw new Error(`Unsupported scheduling operation: ${action.operation}`);
    }
  }

  private async executeTicketAction(action: AIAction, _context: AIContext): Promise<unknown> {
    switch (action.operation) {
      case 'create_ticket':
        return apiClient.post('/tickets', action.payload);

      case 'update_status':
        const { ticketId, status } = action.payload as any;
        return apiClient.patch(`/tickets/${ticketId}`, { status });

      default:
        throw new Error(`Unsupported ticket operation: ${action.operation}`);
    }
  }

  private async executeCustomerAction(action: AIAction, _context: AIContext): Promise<unknown> {
    switch (action.operation) {
      case 'send_notification':
        return apiClient.post('/communications/send', action.payload);

      case 'schedule_followup':
        return apiClient.post('/activities', action.payload);

      default:
        throw new Error(`Unsupported customer operation: ${action.operation}`);
    }
  }

  // ===== ROLLBACK SUPPORT =====

  private async prepareRollback(action: AIAction, _context: AIContext): Promise<unknown> {
    switch (action.domain) {
      case 'dispatch':
        if (action.operation === 'assign_technician') {
          const { workOrderId } = action.payload as any;
          // Store current assignment state
          const currentState = await apiClient.get(`/work-orders/${workOrderId}`);
          return {
            workOrderId,
            originalTechnicianId: currentState.data.assigned_technician_id,
            originalStatus: currentState.data.status
          };
        }
        break;

      case 'tickets':
        if (action.operation === 'update_status') {
          const { ticketId } = action.payload as any;
          const currentState = await apiClient.get(`/tickets/${ticketId}`);
          return {
            ticketId,
            originalStatus: currentState.data.status
          };
        }
        break;
    }

    return null;
  }

  private async performRollback(_actionId: string, rollbackData: unknown): Promise<unknown> {
    const data = rollbackData as any;

    // Implement rollback logic based on rollback data structure
    if (data.workOrderId) {
      return apiClient.patch(`/work-orders/${data.workOrderId}`, {
        assigned_technician_id: data.originalTechnicianId,
        status: data.originalStatus
      });
    }

    if (data.ticketId) {
      return apiClient.patch(`/tickets/${data.ticketId}`, {
        status: data.originalStatus
      });
    }

    throw new Error('Unsupported rollback data structure');
  }

  // ===== HELPER METHODS =====

  private async checkTechnicianAvailability(technicianId: string): Promise<boolean> {
    try {
      const response = await apiClient.get(`/technicians/${technicianId}/availability`);
      return response.data.available;
    } catch {
      return false;
    }
  }

  private async checkScheduleConflict(date: string, time: string, duration?: number): Promise<boolean> {
    try {
      const response = await apiClient.get('/schedule/conflicts', {
        params: { date, time, duration }
      });
      return response.data.hasConflict;
    } catch {
      return false;
    }
  }

  private createSuccessResult(action: AIAction, result: unknown, startTime: number): ActionResult {
    return {
      actionId: action.id,
      success: true,
      result,
      duration: Date.now() - startTime,
      affectedEntities: this.extractAffectedEntities(action, result),
      rollbackAvailable: this.rollbackData.has(action.id)
    };
  }

  private createFailureResult(action: AIAction, error: string, startTime: number, _errors?: string[]): ActionResult {
    return {
      actionId: action.id,
      success: false,
      error,
      duration: Date.now() - startTime,
      affectedEntities: [],
      rollbackAvailable: false
    };
  }

  private extractAffectedEntities(action: AIAction, _result: unknown): EntityReference[] {
    const entities: EntityReference[] = [];

    // Extract entities from action payload
    if (action.payload) {
      const payload = action.payload as any;

      if (payload.workOrderId) {
        entities.push({ type: 'work_order', id: payload.workOrderId });
      }

      if (payload.customerId) {
        entities.push({ type: 'customer', id: payload.customerId });
      }

      if (payload.technicianId) {
        entities.push({ type: 'technician', id: payload.technicianId });
      }

      if (payload.ticketId) {
        entities.push({ type: 'ticket', id: payload.ticketId });
      }
    }

    return entities;
  }

  private async logActionExecution(action: AIAction, result: ActionResult, context: AIContext): Promise<void> {
    try {
      await apiClient.post('/audit/ai-actions', {
        action_id: action.id,
        user_id: context.user.id,
        domain: action.domain,
        operation: action.operation,
        success: result.success,
        duration_ms: result.duration,
        affected_entities: result.affectedEntities,
        context: {
          current_page: context.app.currentPage,
          user_role: context.user.role
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log action execution:', error);
    }
  }

  // ===== PUBLIC QUERY METHODS =====

  getExecutionHistory(): Map<string, ActionResult> {
    return new Map(this.executionHistory);
  }

  getActionResult(actionId: string): ActionResult | undefined {
    return this.executionHistory.get(actionId);
  }

  isRollbackAvailable(actionId: string): boolean {
    const result = this.executionHistory.get(actionId);
    return result?.rollbackAvailable || false;
  }

  clearHistory(): void {
    this.executionHistory.clear();
    this.rollbackData.clear();
  }
}

// ===== TYPES =====

interface ValidationResult {
  valid: boolean;
  errors: string[];
}