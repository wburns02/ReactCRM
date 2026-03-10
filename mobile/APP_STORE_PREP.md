# Mac Septic Field - App Store Submission Guide

## Pre-Submission Checklist

### 1. Apple Developer Account ($99/year)
- [ ] Create account at https://developer.apple.com/programs/
- [ ] Enroll in Apple Developer Program (requires D-U-N-S number for company)
- [ ] Wait for approval (usually 24-48 hours)

### 2. App Store Connect Setup
- [ ] Log in to https://appstoreconnect.apple.com
- [ ] Create new app with bundle ID: `com.macseptic.field`
- [ ] Set app name: "Mac Septic Field"
- [ ] Set primary category: "Business"
- [ ] Set secondary category: "Utilities"

### 3. EAS Configuration
After getting Apple Developer account:
```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo
eas login

# Link project (creates project on expo.dev)
eas init

# Update eas.json with your Apple credentials:
# - appleId: your Apple ID email
# - ascAppId: from App Store Connect
# - appleTeamId: from developer.apple.com/account

# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### 4. App Store Metadata

**App Name:** Mac Septic Field
**Subtitle:** Field Service Management
**Bundle ID:** com.macseptic.field

**Description (4000 char max):**
Mac Septic Field is the mobile companion for Mac Septic service technicians. Manage work orders, capture job site photos, collect customer signatures, and stay connected with the office — all from your iPhone.

Features:
- View and manage today's work orders at a glance
- Start, complete, and track job progress in real-time
- Capture before and after photos for documentation
- Collect customer and technician signatures digitally
- GPS verification for job site arrival
- Works offline — changes sync automatically when back online
- Navigate to job sites with one tap via Apple Maps
- Pull-to-refresh for real-time work order updates

Designed for Mac Septic field technicians to streamline daily operations, reduce paperwork, and improve customer service documentation.

**Keywords (100 char max):**
septic,field service,work orders,technician,crm,service management,job tracking,mobile workforce

**Support URL:** https://macseptic.com/support
**Marketing URL:** https://macseptic.com
**Privacy Policy URL:** https://macseptic.com/privacy (REQUIRED)

### 5. Screenshots Required
Must provide screenshots for:
- iPhone 6.7" (1290 x 2796) - iPhone 15 Pro Max
- iPhone 6.5" (1284 x 2778) - iPhone 14 Plus
- iPad Pro 12.9" (2048 x 2732) - if supporting iPad

Take screenshots of:
1. Login screen
2. Work orders list
3. Work order detail
4. Completion flow (photos)
5. Completion flow (signature)

### 6. App Review Information
**Demo Account (for Apple reviewers):**
- Email: demo@macseptic.com
- Password: (set up a demo account)
- Notes: "Tap any work order to see details. Use the Complete flow to see photo capture and signatures."

### 7. App Privacy (Data Collection)
Apple requires you to declare data usage:

**Data Collected:**
- Contact Info (email, name) - for authentication
- Location - for job site verification
- Photos - for work order documentation
- Usage Data - for app diagnostics

**Data Linked to User:**
- Contact Info
- Location (while using)
- Photos (work orders only)

**Data NOT Collected:**
- Health & Fitness
- Financial Info
- Browsing History
- Search History
- Purchases

### 8. Age Rating
- Select "4+" (no objectionable content)

### 9. Content Rights
- Confirm you own or have rights to all content
- No third-party content issues

## Build & Submit Commands

```bash
# Development build (for testing on device)
eas build --platform ios --profile development

# Preview build (TestFlight)
eas build --platform ios --profile preview

# Production build (App Store)
eas build --platform ios --profile production

# Submit to App Store Connect
eas submit --platform ios --latest

# Or submit a specific build
eas submit --platform ios --id BUILD_ID
```

## TestFlight Testing
1. Build with preview profile
2. Upload to TestFlight via `eas submit`
3. Add internal testers (up to 25)
4. Add external testers (up to 10,000)
5. Apple reviews TestFlight builds (usually 24-48 hours)

## Common App Review Rejections to Avoid
1. **Broken links** - Ensure privacy policy URL works
2. **Incomplete features** - All visible UI must be functional
3. **Missing demo account** - Provide working test credentials
4. **Placeholder content** - No lorem ipsum or TODO items
5. **Permission descriptions** - Must explain WHY you need camera/location
6. **Crashes** - Test thoroughly before submitting
7. **Login-only apps** - Must have value for users (we do, it's B2B)
