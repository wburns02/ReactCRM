/**
 * WebSocket Connection Manager
 * Provides real-time updates for:
 * - Live technician locations
 * - Work order status changes
 * - Instant notifications
 * - Presence indicators
 * - Collaborative editing
 */

import { addBreadcrumb } from '@/lib/sentry';

// ============================================
// Types
// ============================================

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
  senderId?: string;
}

export interface PresenceUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy';
  currentPage?: string;
  lastSeen: string;
}

export interface TechnicianLocation {
  technicianId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  workOrderId?: string;
}

export interface NotificationPayload {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  link?: string;
  timestamp: string;
}

type MessageHandler<T = unknown> = (message: WebSocketMessage<T>) => void;

// ============================================
// WebSocket Manager Class
// ============================================

class WebSocketManager {
  private socket: WebSocket | null = null;
  private url: string;
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();
  private pendingMessages: WebSocketMessage[] = [];

  constructor() {
    // Default WebSocket URL - uses environment variable or derives from API URL
    const apiUrl = import.meta.env.VITE_API_URL || 'https://react-crm-api-production.up.railway.app';
    this.url = import.meta.env.VITE_WS_URL || apiUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';
  }

  // ============================================
  // Connection Management
  // ============================================

  connect(token?: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setStatus('connecting');

    try {
      const url = token ? `${this.url}?token=${token}` : this.url;
      this.socket = new WebSocket(url);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      this.setStatus('error');
      addBreadcrumb('WebSocket connection error', 'websocket', { error }, 'error');
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  private handleOpen(): void {
    this.setStatus('connected');
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.flushPendingMessages();
    addBreadcrumb('WebSocket connected', 'websocket', { url: this.url }, 'info');
  }

  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat();
    addBreadcrumb('WebSocket closed', 'websocket', { code: event.code, reason: event.reason }, 'info');

    if (event.code !== 1000) {
      // Abnormal closure - attempt reconnect
      this.attemptReconnect();
    } else {
      this.setStatus('disconnected');
    }
  }

  private handleError(event: Event): void {
    this.setStatus('error');
    addBreadcrumb('WebSocket error', 'websocket', { event: String(event) }, 'error');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle system messages
      if (message.type === 'pong') {
        return; // Heartbeat response
      }

      // Dispatch to registered handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => handler(message));
      }

      // Also dispatch to wildcard handlers
      const wildcardHandlers = this.messageHandlers.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach(handler => handler(message));
      }
    } catch (error) {
      addBreadcrumb('WebSocket message parse error', 'websocket', { error, data: event.data }, 'error');
    }
  }

  // ============================================
  // Reconnection Logic
  // ============================================

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('error');
      addBreadcrumb('WebSocket max reconnect attempts reached', 'websocket', {}, 'error');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    addBreadcrumb('WebSocket reconnecting', 'websocket', { attempt: this.reconnectAttempts, delay }, 'info');

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // ============================================
  // Heartbeat
  // ============================================

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', payload: {} });
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ============================================
  // Message Sending
  // ============================================

  send<T>(message: Omit<WebSocketMessage<T>, 'timestamp'>): void {
    const fullMessage: WebSocketMessage<T> = {
      ...message,
      timestamp: new Date().toISOString(),
    } as WebSocketMessage<T>;

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(fullMessage));
    } else {
      // Queue message for when connection is restored
      this.pendingMessages.push(fullMessage as WebSocketMessage);
    }
  }

  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (message && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
      }
    }
  }

  // ============================================
  // Subscription Management
  // ============================================

  subscribe<T>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler as MessageHandler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler as MessageHandler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  // ============================================
  // Status Management
  // ============================================

  private setStatus(status: WebSocketStatus): void {
    this.status = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  onStatusChange(listener: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  // ============================================
  // Presence
  // ============================================

  updatePresence(status: PresenceUser['status'], currentPage?: string): void {
    this.send({
      type: 'presence:update',
      payload: { status, currentPage },
    });
  }

  // ============================================
  // Room Management (for collaborative features)
  // ============================================

  joinRoom(roomId: string, roomType: 'workorder' | 'schedule' | 'dashboard'): void {
    this.send({
      type: 'room:join',
      payload: { roomId, roomType },
    });
  }

  leaveRoom(roomId: string): void {
    this.send({
      type: 'room:leave',
      payload: { roomId },
    });
  }
}

// ============================================
// Singleton Export
// ============================================

export const wsManager = new WebSocketManager();

// ============================================
// React Hook Helpers
// ============================================

/**
 * Message type constants for type safety
 */
export const WS_EVENTS = {
  // Work Orders
  WORK_ORDER_CREATED: 'workorder:created',
  WORK_ORDER_UPDATED: 'workorder:updated',
  WORK_ORDER_DELETED: 'workorder:deleted',
  WORK_ORDER_ASSIGNED: 'workorder:assigned',
  WORK_ORDER_STATUS_CHANGED: 'workorder:status',

  // Technician Locations
  TECHNICIAN_LOCATION: 'technician:location',
  TECHNICIAN_STATUS: 'technician:status',

  // Schedule
  SCHEDULE_UPDATED: 'schedule:updated',
  SCHEDULE_CONFLICT: 'schedule:conflict',

  // Notifications
  NOTIFICATION: 'notification',

  // Presence
  PRESENCE_UPDATE: 'presence:update',
  PRESENCE_LIST: 'presence:list',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',

  // System
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',
} as const;

export type WSEventType = typeof WS_EVENTS[keyof typeof WS_EVENTS];
