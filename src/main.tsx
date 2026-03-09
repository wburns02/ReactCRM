import { initSentry } from "./lib/sentry";

// Temporarily disable Sentry to isolate createContext error source
// initSentry();

// Use dynamic imports to avoid immediate React access at module evaluation time
async function initializeApp() {
  try {
    // Dynamic imports to control loading order
    const [
      { StrictMode },
      { createRoot },
      { default: App }
    ] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./App.tsx")
    ]);

    const React = await import("react");

    createRoot(document.getElementById("root")!).render(
      React.createElement(StrictMode, null, React.createElement(App))
    );
  } catch (error) {
    console.error("Failed to initialize app:", error);

    // Fallback error display
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: system-ui; color: #d32f2f;">
        <h1>App Initialization Failed</h1>
        <p>Please refresh the page. If the problem persists, contact support.</p>
        <details style="margin-top: 20px; text-align: left;">
          <summary>Error Details</summary>
          <pre style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px;">${error.message}</pre>
        </details>
      </div>
    `;
  }
}

// Start app initialization
initializeApp();
