/**
 * Dispatch AI Adapter
 *
 * Integrates dispatch/scheduling AI capabilities with the unified assistant
 */

import {
  BaseAIAdapterImpl,
  type UnifiedAIResponse,
  type AdapterSchema,
  type AdapterExample,
  type ActionableInsight
} from './BaseAIAdapter';
import type {
  AIDomain,
  AICapability,
  AIContext,
  AIAction,
  ActionResult,
  HealthStatus
} from '@/api/types/aiAssistant';

// ===== DISPATCH QUERY TYPES =====

export interface DispatchQuery {
  operation: 'optimize_route' | 'suggest_assignment' | 'analyze_capacity' | 'predict_delays' | 'schedule_jobs';
  parameters: DispatchParameters;
}

export interface DispatchParameters {
  technician_id?: string;
  date?: string;
  date_range?: { start: string; end: string };
  work_order_ids?: string[];
  zone?: string;
  service_types?: string[];
  priority_filter?: 'all' | 'urgent' | 'high' | 'normal';
  optimization_goal?: 'time' | 'distance' | 'balanced';
}

export interface DispatchResult {
  recommendations: DispatchRecommendation[];
  schedule_analysis: ScheduleAnalysis;
  optimization_metrics: OptimizationMetrics;
  alerts: DispatchAlert[];
}

export interface DispatchRecommendation {
  id: string;
  type: 'route_change' | 'reassignment' | 'schedule_shift' | 'capacity_alert';
  technician_id: string;
  technician_name: string;
  work_order_id?: string;
  description: string;
  impact: {
    time_saved_minutes: number;
    distance_saved_miles?: number;
    efficiency_gain_percent: number;
  };
  confidence: number;
  action?: AIAction;
}

export interface ScheduleAnalysis {
  total_jobs: number;
  assigned_jobs: number;
  unassigned_jobs: number;
  utilization_by_tech: Record<string, number>;
  bottlenecks: string[];
  coverage_gaps: { zone: string; time_slot: string; severity: 'low' | 'medium' | 'high' }[];
}

export interface OptimizationMetrics {
  current_efficiency: number;
  optimized_efficiency: number;
  total_drive_time_current: number;
  total_drive_time_optimized: number;
  job_completion_probability: number;
}

export interface DispatchAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'delay_risk' | 'capacity_issue' | 'skill_mismatch' | 'weather' | 'traffic';
  message: string;
  affected_jobs: string[];
  suggested_action?: string;
}

// ===== DISPATCH AI ADAPTER =====

export class DispatchAIAdapter extends BaseAIAdapterImpl<DispatchQuery, DispatchResult> {
  readonly domain: AIDomain = 'dispatch';
  readonly version = '1.0.0';
  readonly capabilities: AICapability[] = [
    'query',
    'action',
    'optimization',
    'prediction',
    'recommendation'
  ];

  async query(request: DispatchQuery, context: AIContext): Promise<UnifiedAIResponse<DispatchResult>> {
    const startTime = Date.now();

    try {
      // Execute dispatch-specific operation
      const result = await this.executeDispatchOperation(request, context);

      // Transform to unified response
      const response = this.transformToUnified(result, context);

      // Add dispatch-specific insights
      response.actionable_insights = this.generateDispatchInsights(result, context);
      response.suggested_actions = this.generateSuggestedActions(result, context);
      response.follow_up_questions = this.generateFollowUpQuestions(request.operation);

      // Add processing time
      response.processing.duration_ms = Date.now() - startTime;

      return response;
    } catch (error) {
      return this.createErrorResponse(error, startTime);
    }
  }

  async execute(action: AIAction, context: AIContext): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      // Execute the dispatch action
      const result = await this.executeDispatchAction(action, context);

      return {
        actionId: action.id,
        success: true,
        result,
        duration: Date.now() - startTime,
        affectedEntities: this.extractAffectedEntities(action),
        rollbackAvailable: action.type !== 'analyze'
      };
    } catch (error) {
      return {
        actionId: action.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        affectedEntities: [],
        rollbackAvailable: false
      };
    }
  }

  protected getSourceHookName(): string {
    return 'useAIDispatch';
  }

  getSchema(): AdapterSchema {
    return {
      query_schema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['optimize_route', 'suggest_assignment', 'analyze_capacity', 'predict_delays', 'schedule_jobs']
          },
          parameters: {
            type: 'object',
            properties: {
              technician_id: { type: 'string' },
              date: { type: 'string', format: 'date' },
              date_range: {
                type: 'object',
                properties: {
                  start: { type: 'string' },
                  end: { type: 'string' }
                }
              },
              work_order_ids: { type: 'array', items: { type: 'string' } },
              zone: { type: 'string' },
              service_types: { type: 'array', items: { type: 'string' } },
              priority_filter: { type: 'string', enum: ['all', 'urgent', 'high', 'normal'] },
              optimization_goal: { type: 'string', enum: ['time', 'distance', 'balanced'] }
            }
          }
        },
        required: ['operation', 'parameters']
      },
      response_schema: {
        type: 'object',
        properties: {
          recommendations: { type: 'array' },
          schedule_analysis: { type: 'object' },
          optimization_metrics: { type: 'object' },
          alerts: { type: 'array' }
        }
      }
    };
  }

  getExamples(): AdapterExample[] {
    return [
      {
        name: 'Optimize daily routes',
        description: 'Optimize technician routes for the current day',
        query: {
          operation: 'optimize_route',
          parameters: {
            date: new Date().toISOString().split('T')[0],
            optimization_goal: 'balanced'
          }
        },
        expected_response: {
          recommendations: [],
          schedule_analysis: {
            total_jobs: 24,
            assigned_jobs: 22,
            unassigned_jobs: 2
          }
        }
      },
      {
        name: 'Suggest technician assignment',
        description: 'Recommend best technician for a specific job',
        query: {
          operation: 'suggest_assignment',
          parameters: {
            work_order_ids: ['WO-001'],
            service_types: ['HVAC']
          }
        },
        expected_response: {
          recommendations: [
            {
              type: 'reassignment',
              technician_name: 'John Smith',
              confidence: 0.92
            }
          ]
        }
      }
    ];
  }

  // ===== PRIVATE METHODS =====

  private async executeDispatchOperation(
    request: DispatchQuery,
    context: AIContext
  ): Promise<DispatchResult> {
    // In a real implementation, this would call the dispatch AI service
    // For now, return intelligent demo data based on the operation
    switch (request.operation) {
      case 'optimize_route':
        return this.generateRouteOptimization(request.parameters, context);
      case 'suggest_assignment':
        return this.generateAssignmentSuggestions(request.parameters, context);
      case 'analyze_capacity':
        return this.generateCapacityAnalysis(request.parameters, context);
      case 'predict_delays':
        return this.generateDelayPredictions(request.parameters, context);
      case 'schedule_jobs':
        return this.generateSchedulingSuggestions(request.parameters, context);
      default:
        return this.generateDefaultResponse();
    }
  }

  private generateRouteOptimization(
    _params: DispatchParameters,
    context: AIContext
  ): DispatchResult {
    const technicians = context.domain.technicians || [];

    return {
      recommendations: technicians.slice(0, 3).map((tech, index) => ({
        id: `rec_route_${index}`,
        type: 'route_change' as const,
        technician_id: tech.id,
        technician_name: tech.name,
        description: `Reorder jobs for ${tech.name} to reduce drive time by ${15 + index * 5} minutes`,
        impact: {
          time_saved_minutes: 15 + index * 5,
          distance_saved_miles: 8 + index * 3,
          efficiency_gain_percent: 12 + index * 2
        },
        confidence: 0.88 - index * 0.05
      })),
      schedule_analysis: {
        total_jobs: 24,
        assigned_jobs: 22,
        unassigned_jobs: 2,
        utilization_by_tech: technicians.reduce((acc, tech) => ({
          ...acc,
          [tech.id]: Math.floor(70 + Math.random() * 25)
        }), {}),
        bottlenecks: ['Heavy traffic on I-35 corridor between 8-9 AM'],
        coverage_gaps: [
          { zone: 'North Austin', time_slot: '2:00 PM - 4:00 PM', severity: 'medium' as const }
        ]
      },
      optimization_metrics: {
        current_efficiency: 0.72,
        optimized_efficiency: 0.86,
        total_drive_time_current: 340,
        total_drive_time_optimized: 285,
        job_completion_probability: 0.94
      },
      alerts: [
        {
          id: 'alert_1',
          severity: 'warning',
          type: 'traffic',
          message: 'Heavy traffic expected on I-35 during morning hours',
          affected_jobs: ['WO-1234', 'WO-1235'],
          suggested_action: 'Consider rescheduling North Austin jobs to afternoon'
        }
      ]
    };
  }

  private generateAssignmentSuggestions(
    params: DispatchParameters,
    context: AIContext
  ): DispatchResult {
    const technicians = context.domain.technicians || [];
    const availableTechs = technicians.filter(t => t.status === 'available');

    return {
      recommendations: availableTechs.slice(0, 3).map((tech, index) => ({
        id: `rec_assign_${index}`,
        type: 'reassignment' as const,
        technician_id: tech.id,
        technician_name: tech.name,
        work_order_id: params.work_order_ids?.[0],
        description: `Assign to ${tech.name} - ${index === 0 ? 'Best match' : 'Alternative option'} based on skills and location`,
        impact: {
          time_saved_minutes: 20 - index * 5,
          efficiency_gain_percent: 15 - index * 3
        },
        confidence: 0.92 - index * 0.08
      })),
      schedule_analysis: {
        total_jobs: 1,
        assigned_jobs: 0,
        unassigned_jobs: 1,
        utilization_by_tech: {},
        bottlenecks: [],
        coverage_gaps: []
      },
      optimization_metrics: {
        current_efficiency: 0,
        optimized_efficiency: 0.85,
        total_drive_time_current: 0,
        total_drive_time_optimized: 25,
        job_completion_probability: 0.96
      },
      alerts: []
    };
  }

  private generateCapacityAnalysis(
    _params: DispatchParameters,
    context: AIContext
  ): DispatchResult {
    const technicians = context.domain.technicians || [];

    return {
      recommendations: [
        {
          id: 'rec_capacity_1',
          type: 'capacity_alert' as const,
          technician_id: '',
          technician_name: 'Team',
          description: 'Consider adding an extra technician for the afternoon shift to handle overflow',
          impact: {
            time_saved_minutes: 60,
            efficiency_gain_percent: 20
          },
          confidence: 0.85
        }
      ],
      schedule_analysis: {
        total_jobs: 30,
        assigned_jobs: 24,
        unassigned_jobs: 6,
        utilization_by_tech: technicians.reduce((acc, tech) => ({
          ...acc,
          [tech.id]: Math.floor(80 + Math.random() * 20)
        }), {}),
        bottlenecks: [
          'Afternoon capacity at 95% utilization',
          'HVAC specialists fully booked'
        ],
        coverage_gaps: [
          { zone: 'South Austin', time_slot: '1:00 PM - 5:00 PM', severity: 'high' as const }
        ]
      },
      optimization_metrics: {
        current_efficiency: 0.78,
        optimized_efficiency: 0.90,
        total_drive_time_current: 420,
        total_drive_time_optimized: 350,
        job_completion_probability: 0.82
      },
      alerts: [
        {
          id: 'alert_capacity',
          severity: 'critical',
          type: 'capacity_issue',
          message: 'Afternoon shift at risk of not completing all scheduled jobs',
          affected_jobs: ['WO-1240', 'WO-1241', 'WO-1242'],
          suggested_action: 'Consider overtime or rescheduling non-urgent jobs'
        }
      ]
    };
  }

  private generateDelayPredictions(
    _params: DispatchParameters,
    context: AIContext
  ): DispatchResult {
    return {
      recommendations: [
        {
          id: 'rec_delay_1',
          type: 'schedule_shift' as const,
          technician_id: context.domain.technicians?.[0]?.id || '',
          technician_name: context.domain.technicians?.[0]?.name || 'Mike Johnson',
          work_order_id: 'WO-1234',
          description: 'Job WO-1234 likely to run 30 minutes over - consider notifying next customer',
          impact: {
            time_saved_minutes: 0,
            efficiency_gain_percent: 5
          },
          confidence: 0.78
        }
      ],
      schedule_analysis: {
        total_jobs: 24,
        assigned_jobs: 24,
        unassigned_jobs: 0,
        utilization_by_tech: {},
        bottlenecks: ['Complex job at 123 Main St may cause cascade delays'],
        coverage_gaps: []
      },
      optimization_metrics: {
        current_efficiency: 0.85,
        optimized_efficiency: 0.85,
        total_drive_time_current: 300,
        total_drive_time_optimized: 300,
        job_completion_probability: 0.88
      },
      alerts: [
        {
          id: 'alert_delay_1',
          severity: 'warning',
          type: 'delay_risk',
          message: '3 jobs at risk of delay due to morning traffic patterns',
          affected_jobs: ['WO-1234', 'WO-1235', 'WO-1236'],
          suggested_action: 'Proactively notify customers about potential 15-30 minute delays'
        }
      ]
    };
  }

  private generateSchedulingSuggestions(
    params: DispatchParameters,
    context: AIContext
  ): DispatchResult {
    const technicians = context.domain.technicians || [];

    return {
      recommendations: (params.work_order_ids || []).map((woId, index) => ({
        id: `rec_schedule_${index}`,
        type: 'reassignment' as const,
        technician_id: technicians[index % technicians.length]?.id || '',
        technician_name: technicians[index % technicians.length]?.name || 'Available Tech',
        work_order_id: woId,
        description: `Schedule ${woId} for ${technicians[index % technicians.length]?.name || 'next available technician'}`,
        impact: {
          time_saved_minutes: 10,
          efficiency_gain_percent: 8
        },
        confidence: 0.90
      })),
      schedule_analysis: {
        total_jobs: (params.work_order_ids || []).length,
        assigned_jobs: 0,
        unassigned_jobs: (params.work_order_ids || []).length,
        utilization_by_tech: {},
        bottlenecks: [],
        coverage_gaps: []
      },
      optimization_metrics: {
        current_efficiency: 0,
        optimized_efficiency: 0.88,
        total_drive_time_current: 0,
        total_drive_time_optimized: 45,
        job_completion_probability: 0.95
      },
      alerts: []
    };
  }

  private generateDefaultResponse(): DispatchResult {
    return {
      recommendations: [],
      schedule_analysis: {
        total_jobs: 0,
        assigned_jobs: 0,
        unassigned_jobs: 0,
        utilization_by_tech: {},
        bottlenecks: [],
        coverage_gaps: []
      },
      optimization_metrics: {
        current_efficiency: 0,
        optimized_efficiency: 0,
        total_drive_time_current: 0,
        total_drive_time_optimized: 0,
        job_completion_probability: 0
      },
      alerts: []
    };
  }

  private generateDispatchInsights(
    result: DispatchResult,
    _context: AIContext
  ): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    // Efficiency insight
    if (result.optimization_metrics.optimized_efficiency > result.optimization_metrics.current_efficiency) {
      const improvement = Math.round(
        (result.optimization_metrics.optimized_efficiency - result.optimization_metrics.current_efficiency) * 100
      );
      insights.push({
        type: 'optimization',
        category: 'optimization',
        title: 'Route Optimization Available',
        description: `Applying suggested route changes could improve efficiency by ${improvement}%`,
        priority: improvement > 15 ? 'high' : 'medium',
        confidence: 0.88,
        estimated_impact: {
          type: 'time_saved',
          amount: result.optimization_metrics.total_drive_time_current - result.optimization_metrics.total_drive_time_optimized,
          unit: 'minutes'
        },
        estimatedValue: {
          type: 'time_saved',
          amount: result.optimization_metrics.total_drive_time_current - result.optimization_metrics.total_drive_time_optimized,
          unit: 'minutes'
        }
      });
    }

    // Capacity insight
    if (result.schedule_analysis.unassigned_jobs > 0) {
      insights.push({
        type: 'risk',
        category: 'risk',
        title: 'Unassigned Jobs Detected',
        description: `${result.schedule_analysis.unassigned_jobs} jobs need technician assignment`,
        priority: result.schedule_analysis.unassigned_jobs > 3 ? 'high' : 'medium',
        confidence: 1.0
      });
    }

    // Alert-based insights
    result.alerts.forEach(alert => {
      if (alert.severity === 'critical' || alert.severity === 'warning') {
        insights.push({
          type: alert.severity === 'critical' ? 'risk' : 'information',
          category: alert.severity === 'critical' ? 'risk' : 'information',
          title: alert.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: alert.message,
          priority: alert.severity === 'critical' ? 'critical' : 'medium',
          confidence: 0.85
        });
      }
    });

    return insights;
  }

  private generateSuggestedActions(
    result: DispatchResult,
    _context: AIContext
  ): AIAction[] {
    return result.recommendations.slice(0, 3).map((rec, index) => ({
      id: `action_dispatch_${Date.now()}_${index}`,
      type: rec.type === 'reassignment' ? 'schedule' as const : 'optimize' as const,
      domain: 'dispatch' as const,
      operation: rec.type,
      payload: {
        technician_id: rec.technician_id,
        work_order_id: rec.work_order_id,
        recommendation_id: rec.id
      },
      requirements: [
        {
          type: 'confirmation' as const,
          description: 'User confirmation required before applying changes',
          satisfied: false
        }
      ],
      status: 'pending' as const,
      confidence: rec.confidence,
      estimatedImpact: {
        time_saved_minutes: rec.impact.time_saved_minutes
      }
    }));
  }

  private generateFollowUpQuestions(operation: string): string[] {
    const questions: Record<string, string[]> = {
      optimize_route: [
        'Would you like me to apply these route optimizations?',
        'Should I notify technicians about their updated routes?',
        'Want to see optimization options for a specific technician?'
      ],
      suggest_assignment: [
        'Should I assign the recommended technician?',
        'Would you like to see alternative assignment options?',
        'Should I check the technician\'s current workload?'
      ],
      analyze_capacity: [
        'Would you like recommendations to address capacity issues?',
        'Should I check overtime availability?',
        'Want to see which jobs could be rescheduled?'
      ],
      predict_delays: [
        'Should I send proactive delay notifications to customers?',
        'Would you like to adjust the schedule to minimize delays?',
        'Want to see alternative routing to avoid delays?'
      ],
      schedule_jobs: [
        'Should I confirm these scheduling suggestions?',
        'Would you like to adjust any of the proposed time slots?',
        'Should I send appointment confirmations to customers?'
      ]
    };

    return questions[operation] || [
      'What else would you like to know about the dispatch schedule?',
      'Should I analyze a different aspect of operations?'
    ];
  }

  private async executeDispatchAction(
    action: AIAction,
    _context: AIContext
  ): Promise<unknown> {
    // In a real implementation, this would call the appropriate API
    // For now, return a mock result
    return {
      success: true,
      message: `Successfully executed ${action.operation}`,
      affected_entities: action.payload
    };
  }

  private extractAffectedEntities(action: AIAction): { type: string; id: string }[] {
    const entities: { type: string; id: string }[] = [];

    if (action.payload.technician_id) {
      entities.push({ type: 'technician', id: action.payload.technician_id as string });
    }
    if (action.payload.work_order_id) {
      entities.push({ type: 'work_order', id: action.payload.work_order_id as string });
    }

    return entities;
  }

  private createErrorResponse(error: unknown, startTime: number): UnifiedAIResponse<DispatchResult> {
    return {
      domain: this.domain,
      operation: 'error',
      result: {
        primary: this.generateDefaultResponse(),
        metadata: {
          source_hook: this.getSourceHookName(),
          transformation_applied: false,
          demo_data_used: false,
          context_used: [],
          generated_at: new Date().toISOString()
        }
      },
      confidence: 0,
      completeness: 0,
      freshness: 0,
      processing: {
        duration_ms: Date.now() - startTime,
        cache_hit: false,
        model_version: this.version
      },
      errors: [{
        code: 'DISPATCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown dispatch error',
        domain: this.domain,
        recoverable: true,
        suggestedFix: 'Please try again or check the dispatch parameters'
      }]
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    return {
      status: 'healthy',
      response_time_ms: Date.now() - startTime,
      error_rate: 0,
      last_check: new Date().toISOString(),
      issues: []
    };
  }
}

// ===== VALIDATION =====

export function validateDispatchQuery(query: unknown): query is DispatchQuery {
  if (!query || typeof query !== 'object') return false;

  const q = query as Record<string, unknown>;

  const validOperations = ['optimize_route', 'suggest_assignment', 'analyze_capacity', 'predict_delays', 'schedule_jobs'];

  return (
    typeof q.operation === 'string' &&
    validOperations.includes(q.operation) &&
    typeof q.parameters === 'object'
  );
}
