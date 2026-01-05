# CRM Mobile App

React Native mobile application for field service technicians built with Expo.

## Features

- **Offline-First Architecture**: Queue changes when offline, sync when connected
- **Work Order Management**: View, start, and complete work orders
- **Photo Capture**: Take before/after photos of work sites
- **Signature Capture**: Get customer and technician signatures
- **Location Tracking**: GPS verification for arrivals
- **Push Notifications**: Real-time job assignments (coming soon)
- **Barcode Scanning**: Scan parts and equipment (coming soon)

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start the development server
npm start
```

### Running on Device

```bash
# iOS
npm run ios

# Android
npm run android
```

## Project Structure

```
mobile/
├── App.tsx                 # Main entry point
├── app.json                # Expo configuration
├── src/
│   ├── api/
│   │   ├── client.ts       # API client with auth
│   │   ├── hooks.ts        # React Query hooks
│   │   ├── offlineQueue.ts # Offline sync queue
│   │   └── types.ts        # TypeScript types
│   ├── components/
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── OfflineBanner.tsx
│   │   └── WorkOrderCard.tsx
│   ├── hooks/
│   │   └── useOffline.ts   # Offline state management
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   └── WorkOrdersScreen.tsx
│   └── utils/
│       ├── formatters.ts   # Date, currency, etc.
│       └── theme.ts        # Colors, typography
├── assets/                 # Images, icons
└── package.json
```

## Authentication

The app uses JWT tokens stored securely via `expo-secure-store`. Tokens are automatically:
- Added to API requests
- Refreshed when needed
- Cleared on 401 responses

## Offline Support

All mutations are queued when offline and synced when connection is restored:

```typescript
// Automatic queuing
await apiClient.post('/work-orders/123/complete', data);
// If offline, queued automatically

// Manual sync trigger
const { syncNow } = useOffline();
await syncNow();
```

## API Integration

The mobile app connects to the same API as the web app:

- **Base URL**: `https://react-crm-api-production.up.railway.app/api/v2`
- **Authentication**: Bearer token (JWT)

## Building for Production

```bash
# Build for iOS
npx eas build --platform ios

# Build for Android
npx eas build --platform android
```

## Environment Configuration

Configure in `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://your-api-url.com/api/v2"
    }
  }
}
```

## Tech Stack

- **Framework**: React Native + Expo SDK 52
- **Navigation**: Expo Router
- **State Management**: TanStack React Query
- **API Client**: Axios
- **Validation**: Zod
- **Storage**: AsyncStorage + SecureStore

## Contributing

1. Create a feature branch
2. Make changes
3. Test on both iOS and Android
4. Submit PR

## License

Proprietary - All rights reserved
