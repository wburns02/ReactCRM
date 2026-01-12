import { useState, useEffect, useCallback } from "react";
import {
  useVapidKey,
  subscribeToBrowserPush,
  isPushSupported,
  getCurrentPushSubscription,
  useSubscribePush,
} from "@/api/hooks/usePushNotifications";

/**
 * Push Notification Prompt Component
 * Encourages users to enable push notifications
 */
export function PushNotificationPrompt() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem("push-prompt-dismissed") === "true";
  });

  const { data: vapidData } = useVapidKey();
  const subscribeToServer = useSubscribePush();

  const isSupported = isPushSupported();
  const permission =
    "Notification" in window ? Notification.permission : "denied";

  // Check if already subscribed
  useEffect(() => {
    if (isSupported) {
      getCurrentPushSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    }
  }, [isSupported]);

  const handleDismiss = () => {
    localStorage.setItem("push-prompt-dismissed", "true");
    setIsDismissed(true);
  };

  const handleEnable = useCallback(async () => {
    if (!vapidData?.publicKey) return;

    setIsLoading(true);
    try {
      const subscription = await subscribeToBrowserPush(vapidData.publicKey);
      if (subscription) {
        // Send to server
        await subscribeToServer.mutateAsync({
          subscription,
          device_name: navigator.userAgent.slice(0, 50),
          device_type: /mobile/i.test(navigator.userAgent)
            ? "mobile"
            : "desktop",
        });
        setIsSubscribed(true);
        setIsDismissed(true);
      }
    } catch (err) {
      console.error("Failed to subscribe:", err);
    } finally {
      setIsLoading(false);
    }
  }, [vapidData, subscribeToServer]);

  // Don't show if not supported, already subscribed, permission denied, or dismissed
  if (!isSupported || isSubscribed || permission === "denied" || isDismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-amber-800">Stay Updated</h4>
          <p className="text-amber-700 text-sm mt-1">
            Enable notifications to receive real-time updates about new jobs,
            schedule changes, and important alerts.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={isLoading || !vapidData?.publicKey}
              className="px-4 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Enabling..." : "Enable Notifications"}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-1.5 text-amber-700 text-sm font-medium hover:bg-amber-100 rounded-md transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PushNotificationPrompt;
