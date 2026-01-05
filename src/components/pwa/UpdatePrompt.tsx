import { usePWA } from '@/hooks/usePWA';

/**
 * Update Prompt Component
 * Shows a banner when a new version of the app is available
 */
export function UpdatePrompt() {
  const { hasUpdate, updateApp } = usePWA();

  if (!hasUpdate) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-3 shadow-lg z-50 animate-slide-down">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <p className="font-medium">A new version is available!</p>
            <p className="text-green-100 text-sm">Click update to get the latest features and fixes</p>
          </div>
        </div>
        <button
          onClick={updateApp}
          className="flex-shrink-0 px-5 py-2 bg-white text-green-700 text-sm font-semibold rounded-lg hover:bg-green-50 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Update Now
        </button>
      </div>
    </div>
  );
}

export default UpdatePrompt;
