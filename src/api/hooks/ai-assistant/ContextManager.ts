/**
 * Context Manager
 *
 * Aggregates and manages context from all application layers to provide
 * comprehensive situational awareness to the AI Assistant
 */

import { useLocation } from 'react-router-dom';
import type {
  AIContext,
  EntityContext,
  ActivityContext,
  NavigationContext,
  ViewportContext,
  UserRole,
  CustomerContext,
  WorkOrderContext,
  TicketContext,
  ScheduleContext,
  TechnicianContext,
  AIPreferences
} from '@/api/types/aiAssistant';

export class ContextManager {
  private contextCache: Map<string, AIContext> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds

  // ===== MAIN CONTEXT AGGREGATION =====

  async aggregateContext(userId: string, sessionId: string): Promise<AIContext> {
    const cacheKey = `${userId}_${sessionId}`;
    const cached = this.getCachedContext(cacheKey);

    if (cached) {
      return cached;
    }

    const context = await this.buildCompleteContext(userId, sessionId);
    this.setCachedContext(cacheKey, context);

    return context;
  }

  private async buildCompleteContext(userId: string, sessionId: string): Promise<AIContext> {
    const [userContext, appContext, domainContext, sessionContext] = await Promise.all([
      this.buildUserContext(userId),
      this.buildAppContext(),
      this.buildDomainContext(),
      this.buildSessionContext(sessionId)
    ]);

    return {
      user: userContext,
      app: appContext,
      domain: domainContext,
      session: sessionContext
    };
  }

  // ===== USER CONTEXT =====

  private async buildUserContext(userId: string) {
    // In a real implementation, this would fetch from user service
    return {
      id: userId,
      role: this.getCurrentUserRole(),
      permissions: await this.getUserPermissions(userId),
      preferences: await this.getUserPreferences(userId),
      department: await this.getUserDepartment(userId)
    };
  }

  private getCurrentUserRole(): UserRole {
    // This would integrate with your auth system
    // For now, return a default
    return 'manager';
  }

  private async getUserPermissions(_userId: string): Promise<string[]> {
    // Fetch user permissions from auth system
    return ['read:customers', 'write:tickets', 'execute:ai_actions'];
  }

  private async getUserPreferences(_userId: string): Promise<AIPreferences> {
    // Fetch from user preferences storage
    return {
      communicationStyle: 'detailed',
      notificationFrequency: 'immediate',
      autoExecuteThreshold: 0.85,
      preferredResponseFormat: 'structured',
      voiceEnabled: true,
      proactiveSuggestions: true,
      executiveMode: {
        enabled: false,
        confidenceThreshold: 0.9,
        allowedTypes: ['create', 'update'],
        maxAutoExecutionsPerHour: 10,
        showNotifications: true,
        requireConnection: true
      }
    };
  }

  private async getUserDepartment(_userId: string): Promise<string | undefined> {
    // Fetch department from HR system
    return 'Operations';
  }

  // ===== APPLICATION CONTEXT =====

  private async buildAppContext() {
    return {
      currentPage: this.getCurrentPagePath(),
      currentEntity: await this.getCurrentEntity(),
      recentActivity: await this.getRecentActivity(),
      navigationHistory: this.getNavigationHistory(),
      viewport: this.getViewportContext()
    };
  }

  private getCurrentPagePath(): string {
    return window.location.pathname;
  }

  private async getCurrentEntity(): Promise<EntityContext | undefined> {
    const path = window.location.pathname;
    const entityMatch = this.extractEntityFromPath(path);

    if (entityMatch) {
      return {
        type: entityMatch.type,
        id: entityMatch.id,
        data: await this.fetchEntityData(entityMatch.type, entityMatch.id)
      };
    }

    return undefined;
  }

  private extractEntityFromPath(path: string): { type: EntityContext['type']; id: string } | null {
    // Extract entity information from URL patterns
    const patterns = [
      { pattern: /\/customers\/([^/]+)/, type: 'customer' as const },
      { pattern: /\/work-orders\/([^/]+)/, type: 'work_order' as const },
      { pattern: /\/tickets\/([^/]+)/, type: 'ticket' as const },
      { pattern: /\/technicians\/([^/]+)/, type: 'technician' as const },
      { pattern: /\/invoices\/([^/]+)/, type: 'invoice' as const },
      { pattern: /\/schedule/, type: 'schedule' as const }
    ];

    for (const { pattern, type } of patterns) {
      const match = path.match(pattern);
      if (match) {
        return {
          type,
          id: match[1] || 'current'
        };
      }
    }

    return null;
  }

  private async fetchEntityData(type: string, id: string): Promise<Record<string, unknown> | undefined> {
    try {
      // This would fetch actual entity data from APIs
      // For now, return placeholder
      return {
        id,
        type,
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`Failed to fetch entity data for ${type}:${id}`, error);
      return undefined;
    }
  }

  private async getRecentActivity(): Promise<ActivityContext[]> {
    // Get recent user activity from activity tracking
    return [
      {
        type: 'page_visit',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        entity: {
          type: 'customer',
          id: 'customer_123'
        },
        details: {
          duration: 120,
          interactions: ['view', 'edit']
        }
      }
    ];
  }

  private getNavigationHistory(): NavigationContext[] {
    // Get navigation history from browser or tracking system
    return [
      {
        path: '/dashboard',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        duration: 180
      },
      {
        path: '/customers',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        duration: 120
      }
    ];
  }

  private getViewportContext(): ViewportContext {
    const width = window.innerWidth;
    const height = window.innerHeight;

    return {
      width,
      height,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      orientation: width > height ? 'landscape' : 'portrait'
    };
  }

  // ===== DOMAIN CONTEXT =====

  private async buildDomainContext() {
    return {
      customers: await this.getCustomerContext(),
      workOrders: await this.getWorkOrderContext(),
      tickets: await this.getTicketContext(),
      schedule: await this.getScheduleContext(),
      technicians: await this.getTechnicianContext()
    };
  }

  private async getCustomerContext(): Promise<CustomerContext[]> {
    // Get relevant customer context based on current page/activity
    const currentEntity = await this.getCurrentEntity();

    if (currentEntity?.type === 'customer') {
      return [{
        id: currentEntity.id,
        name: 'John Smith Construction', // Would fetch from API
        tier: 'vip',
        risk_level: 'low',
        recent_interactions: 5,
        satisfaction_score: 8.5
      }];
    }

    return [];
  }

  private async getWorkOrderContext(): Promise<WorkOrderContext[]> {
    const currentEntity = await this.getCurrentEntity();

    if (currentEntity?.type === 'work_order') {
      return [{
        id: currentEntity.id,
        status: 'in_progress',
        priority: 'high',
        technician_id: 'tech_456',
        customer_id: 'customer_123',
        scheduled_date: '2025-01-14T10:00:00Z',
        service_type: 'hvac_maintenance'
      }];
    }

    return [];
  }

  private async getTicketContext(): Promise<TicketContext[]> {
    const currentEntity = await this.getCurrentEntity();

    if (currentEntity?.type === 'ticket') {
      return [{
        id: currentEntity.id,
        status: 'open',
        priority: 'medium',
        category: 'maintenance',
        assigned_to: 'tech_789',
        customer_id: 'customer_456',
        created_at: '2025-01-13T14:30:00Z'
      }];
    }

    return [];
  }

  private async getScheduleContext(): Promise<ScheduleContext | undefined> {
    const path = window.location.pathname;

    if (path.includes('/schedule')) {
      return {
        current_date: new Date().toISOString().split('T')[0],
        view_type: this.extractScheduleViewType(path),
        selected_technician: this.extractSelectedTechnician(path),
        filter_criteria: await this.getScheduleFilters(),
        conflicts: 2,
        utilization_rate: 0.85
      };
    }

    return undefined;
  }

  private async getTechnicianContext(): Promise<TechnicianContext[]> {
    const currentEntity = await this.getCurrentEntity();

    if (currentEntity?.type === 'technician') {
      return [{
        id: currentEntity.id,
        name: 'Mike Rodriguez',
        status: 'available',
        location: {
          lat: 40.7128,
          lng: -74.0060,
          address: '123 Main St, New York, NY'
        },
        skills: ['hvac', 'plumbing', 'electrical'],
        current_job: undefined,
        rating: 4.8
      }];
    }

    return [];
  }

  // ===== SESSION CONTEXT =====

  private async buildSessionContext(sessionId: string) {
    return {
      conversationHistory: await this.getConversationHistory(sessionId),
      activeIntents: await this.getActiveIntents(sessionId),
      pendingActions: await this.getPendingActions(sessionId),
      executedActions: await this.getExecutedActions(sessionId)
    };
  }

  private async getConversationHistory(_sessionId: string) {
    // Fetch conversation history from storage
    return [];
  }

  private async getActiveIntents(_sessionId: string) {
    // Get intents that are currently being processed
    return [];
  }

  private async getPendingActions(_sessionId: string) {
    // Get actions waiting for execution or approval
    return [];
  }

  private async getExecutedActions(_sessionId: string) {
    // Get recently executed actions for this session
    return [];
  }

  // ===== CONTEXT UPDATES =====

  updateEntityContext(entity: EntityContext): void {
    // Update cached context with new entity information
    this.contextCache.forEach((context) => {
      if (context.app.currentEntity?.id === entity.id) {
        context.app.currentEntity = entity;
      }
    });
  }

  addActivityContext(activity: ActivityContext): void {
    // Add new activity to context
    this.contextCache.forEach((context) => {
      context.app.recentActivity.unshift(activity);
      // Keep only last 10 activities
      if (context.app.recentActivity.length > 10) {
        context.app.recentActivity = context.app.recentActivity.slice(0, 10);
      }
    });
  }

  updateNavigationContext(navigation: NavigationContext): void {
    // Update navigation history
    this.contextCache.forEach((context) => {
      context.app.navigationHistory.unshift(navigation);
      // Keep only last 20 navigation entries
      if (context.app.navigationHistory.length > 20) {
        context.app.navigationHistory = context.app.navigationHistory.slice(0, 20);
      }
    });
  }

  // ===== HELPER METHODS =====

  private extractScheduleViewType(path: string): 'day' | 'week' | 'month' {
    if (path.includes('day')) return 'day';
    if (path.includes('month')) return 'month';
    return 'week'; // default
  }

  private extractSelectedTechnician(path: string): string | undefined {
    const match = path.match(/technician=([^&]+)/);
    return match ? match[1] : undefined;
  }

  private async getScheduleFilters(): Promise<Record<string, unknown>> {
    const params = new URLSearchParams(window.location.search);
    const filters: Record<string, unknown> = {};

    params.forEach((value, key) => {
      filters[key] = value;
    });

    return filters;
  }

  // ===== CACHE MANAGEMENT =====

  private getCachedContext(cacheKey: string): AIContext | null {
    const expiry = this.cacheExpiry.get(cacheKey);
    if (!expiry || Date.now() > expiry) {
      this.contextCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
      return null;
    }

    return this.contextCache.get(cacheKey) || null;
  }

  private setCachedContext(cacheKey: string, context: AIContext): void {
    this.contextCache.set(cacheKey, context);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
  }

  clearCache(): void {
    this.contextCache.clear();
    this.cacheExpiry.clear();
  }
}

// ===== REACT HOOK FOR CONTEXT MANAGEMENT =====

export function useContextManager() {
  const location = useLocation();
  const contextManager = new ContextManager();

  // Update navigation context when route changes
  React.useEffect(() => {
    contextManager.updateNavigationContext({
      path: location.pathname,
      timestamp: new Date().toISOString()
    });
  }, [location.pathname, contextManager]);

  return contextManager;
}

// Add React import for useEffect
import React from 'react';