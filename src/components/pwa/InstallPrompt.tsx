import { usePWA } from '@/hooks/usePWA';

/**
 * Install Prompt Component
 * Shows a banner encouraging users to install the PWA
 */
export function InstallPrompt() {
  const {
    isInstallable,
    isInstalled,
    isPWA,
    isIOS,
    isDismissed,
    promptInstall,
    dismissInstall
  } = usePWA();

  // Don't show if already installed, dismissed, or not installable
  if (isInstalled || isPWA || isDismissed) {
    return null;
  }

  // iOS-specific instructions (no beforeinstallprompt event)
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg z-50 animate-slide-up">
        <div className="max-w-4xl mx-auto flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">Install ECBTX CRM</h3>
            <p className="text-blue-100 text-sm mt-1">
              Tap <span className="inline-flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L12 14M12 14L7 9M12 14L17 9" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <rect x="4" y="18" width="16" height="2" rx="1"/>
                </svg>
              </span> then <strong>"Add to Home Screen"</strong> for the best experience
            </p>
          </div>
          <button
            onClick={dismissInstall}
            className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Standard install prompt for Android/Desktop
  if (!isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg z-50 animate-slide-up">
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg">Install ECBTX CRM</h3>
          <p className="text-blue-100 text-sm">
            Install for quick access, offline support, and push notifications
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            onClick={dismissInstall}
            className="px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-lg transition-colors"
          >
            Not now
          </button>
          <button
            onClick={promptInstall}
            className="px-4 py-2 bg-white text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
