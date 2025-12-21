# Service Worker Strategy for React Migration

## Current Status: NO SERVICE WORKER

The React app intentionally does **NOT** register a service worker or PWA features.
This is by design to avoid conflicts with the legacy service worker.

## Why No SW for React (Phase 1)

1. **Legacy SW Collision**: The existing `sw.js` in `frontend/` handles caching for legacy pages.
   Running two service workers would cause:
   - Cache conflicts
   - Stale data issues
   - Unpredictable offline behavior

2. **Safe Rollout**: During the migration, users switch between React (`/app/*`) and
   legacy (`/*.html`) pages. A React SW would interfere with legacy page caching.

3. **Simplicity**: Focus on functionality first, then optimize with PWA later.

## Verification

The React build should NOT contain:
- `sw.js` in dist/
- `manifest.json` (unless purely for icons, no SW registration)
- Any `navigator.serviceWorker.register()` calls

Check with:
```bash
cd frontend-react
npm run build
ls -la dist/ | grep -E "(sw|manifest)"  # Should show nothing or only manifest.json
grep -r "serviceWorker" dist/           # Should show nothing
```

## Future PWA Implementation (Phase 2)

When React migration is complete and legacy pages are retired:

### 1. Install Vite PWA Plugin
```bash
npm install -D vite-plugin-pwa
```

### 2. Configure in vite.config.ts
```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Cache strategy for API calls
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Mac Septic CRM',
        short_name: 'MacSeptic',
        theme_color: '#0091ae',
        background_color: '#f5f8fa',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
```

### 3. Retirement of Legacy SW

Before enabling React PWA:
1. Remove or update `frontend/sw.js` to unregister itself
2. Clear legacy caches from user browsers
3. Add migration script in legacy pages:

```javascript
// Add to legacy pages before React PWA rollout
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      if (registration.scope.includes('/app')) return; // Keep React SW
      registration.unregister();
    });
  });
}
```

## Timeline

| Phase | SW Status | Notes |
|-------|-----------|-------|
| Week 1-4 | None | React MVP, no SW |
| Week 5-8 | None | Migration, parallel pages |
| Week 9+ | Vite PWA | After legacy retirement |

## Related Files

- `vite.config.ts` - Build config (no PWA plugin)
- `frontend/sw.js` - Legacy service worker (separate)
- `index.html` - No SW registration script
