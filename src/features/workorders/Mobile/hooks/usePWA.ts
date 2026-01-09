/**
 * usePWA - PWA features hook for mobile field service
 *
 * Features:
 * - useInstallPrompt - PWA installation
 * - useServiceWorker - Service worker management
 * - useBackgroundSync - Background sync registration
 * - usePushNotifications - Push notification setup
 *
 * Works with the existing usePWA hook in @/hooks/usePWA
 * but provides additional mobile-specific functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// Types
// ============================================

export interface InstallPromptState {
  /** Whether install prompt is available */
  canInstall: boolean;
  /** Whether app is already installed */
  isInstalled: boolean;
  /** Whether running in standalone mode (PWA) */
  isStandalone: boolean;
  /** Whether on iOS (needs special instructions) */
  isIOS: boolean;
  /** Show the install prompt */
  promptInstall: () => Promise<boolean>;
  /** Dismiss install prompt for a period */
  dismissPrompt: () => void;
  /** Whether user has dismissed the prompt */
  isDismissed: boolean;
}

export interface ServiceWorkerState {
  /** Whether service worker is supported */
  isSupported: boolean;
  /** Whether service worker is registered */
  isRegistered: boolean;
  /** Whether service worker is active */
  isActive: boolean;
  /** Whether an update is available */
  hasUpdate: boolean;
  /** Apply the pending update */
  applyUpdate: () => void;
  /** Force check for updates */
  checkForUpdate: () => Promise<void>;
}

export interface BackgroundSyncState {
  /** Whether Background Sync is supported */
  isSupported: boolean;
  /** Register a sync task */
  registerSync: (tag: string) => Promise<boolean>;
  /** Get registered sync tags */
  getSyncTags: () => Promise<string[]>;
}

export interface PushNotificationState {
  /** Whether Push is supported */
  isSupported: boolean;
  /** Current permission status */
  permission: NotificationPermission | 'unsupported';
  /** Request permission */
  requestPermission: () => Promise<boolean>;
  /** Subscribe to push */
  subscribe: () => Promise<PushSubscription | null>;
  /** Unsubscribe from push */
  unsubscribe: () => Promise<boolean>;
  /** Current subscription */
  subscription: PushSubscription | null;
}

// ============================================
// Browser Interfaces
// ============================================

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

declare global {
  interface ServiceWorkerRegistration {
    sync?: SyncManager;
    periodicSync?: {
      register(tag: string, options?: { minInterval: number }): Promise<void>;
      getTags(): Promise<string[]>;
      unregister(tag: string): Promise<void>;
    };
  }
}

// ============================================
// Constants
// ============================================

const DISMISS_KEY = 'pwa-mobile-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// ============================================
// useInstallPrompt Hook
// ============================================

export function useInstallPrompt(): InstallPromptState {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Check standalone mode
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

  // Check iOS
  const isIOS =
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Check dismissed state
  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissTime < DISMISS_DURATION) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(DISMISS_KEY);
      }
    }
  }, []);

  // Listen for install prompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    setIsInstalled(isStandalone);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPromptRef.current) {
      return false;
    }

    try {
      await deferredPromptRef.current.prompt();
      const choice = await deferredPromptRef.current.userChoice;

      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
        deferredPromptRef.current = null;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Install prompt error:', error);
      return false;
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsDismissed(true);
  }, []);

  return {
    canInstall,
    isInstalled,
    isStandalone,
    isIOS,
    promptInstall,
    dismissPrompt,
    isDismissed,
  };
}

// ============================================
// useServiceWorker Hook
// ============================================

export function useServiceWorker(): ServiceWorkerState {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker.ready.then((registration) => {
      registrationRef.current = registration;
      setIsRegistered(true);
      setIsActive(!!navigator.serviceWorker.controller);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setHasUpdate(true);
            }
          });
        }
      });
    });

    // Listen for controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      setIsActive(true);
    });
  }, [isSupported]);

  const applyUpdate = useCallback(() => {
    if (registrationRef.current?.waiting) {
      registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (registrationRef.current) {
      await registrationRef.current.update();
    }
  }, []);

  return {
    isSupported,
    isRegistered,
    isActive,
    hasUpdate,
    applyUpdate,
    checkForUpdate,
  };
}

// ============================================
// useBackgroundSync Hook
// ============================================

export function useBackgroundSync(): BackgroundSyncState {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const isSupported =
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'SyncManager' in window;

  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker.ready.then((registration) => {
      registrationRef.current = registration;
    });
  }, [isSupported]);

  const registerSync = useCallback(
    async (tag: string): Promise<boolean> => {
      if (!registrationRef.current?.sync) {
        console.warn('Background Sync not supported');
        return false;
      }

      try {
        await registrationRef.current.sync.register(tag);
        return true;
      } catch (error) {
        console.error('Failed to register sync:', error);
        return false;
      }
    },
    []
  );

  const getSyncTags = useCallback(async (): Promise<string[]> => {
    if (!registrationRef.current?.sync) {
      return [];
    }

    try {
      return await registrationRef.current.sync.getTags();
    } catch (error) {
      console.error('Failed to get sync tags:', error);
      return [];
    }
  }, []);

  return {
    isSupported,
    registerSync,
    getSyncTags,
  };
}

// ============================================
// usePushNotifications Hook
// ============================================

export function usePushNotifications(): PushNotificationState {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'unsupported'
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const isSupported =
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then(async (registration) => {
      registrationRef.current = registration;

      // Get existing subscription
      const existingSub = await registration.pushManager.getSubscription();
      setSubscription(existingSub);
    });
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!registrationRef.current || permission !== 'granted') {
      return null;
    }

    try {
      // In production, get the VAPID public key from your server
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured');
        return null;
      }

      const sub = await registrationRef.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      setSubscription(sub);
      return sub;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }, [permission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      return false;
    }

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      return true;
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      return false;
    }
  }, [subscription]);

  return {
    isSupported,
    permission,
    requestPermission,
    subscribe,
    unsubscribe,
    subscription,
  };
}

// ============================================
// Combined PWA Hook (convenience)
// ============================================

export interface MobilePWAState {
  install: InstallPromptState;
  serviceWorker: ServiceWorkerState;
  backgroundSync: BackgroundSyncState;
  pushNotifications: PushNotificationState;
  /** Whether app is running as PWA */
  isPWA: boolean;
  /** Whether device is online */
  isOnline: boolean;
}

export function useMobilePWA(): MobilePWAState {
  const install = useInstallPrompt();
  const serviceWorker = useServiceWorker();
  const backgroundSync = useBackgroundSync();
  const pushNotifications = usePushNotifications();

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    install,
    serviceWorker,
    backgroundSync,
    pushNotifications,
    isPWA: install.isStandalone,
    isOnline,
  };
}

export default useMobilePWA;
