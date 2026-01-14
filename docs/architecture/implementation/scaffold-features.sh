#!/bin/bash

# ECBTX CRM - Feature Directory Scaffold Script
# Generated: 2026-01-09
# Purpose: Creates all feature directories and placeholder files

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC_DIR="$PROJECT_ROOT/src"
FEATURES_DIR="$SRC_DIR/features"
COMPONENTS_DIR="$SRC_DIR/components"

echo "🏗️  ECBTX CRM Feature Scaffold Starting..."
echo "Project Root: $PROJECT_ROOT"
echo ""

# ============================================================================
# 1. FIELD SERVICE FEATURE
# ============================================================================

echo "📦 Creating Field Service Feature..."

mkdir -p "$FEATURES_DIR/field/pages"
touch "$FEATURES_DIR/field/pages/MyJobsPage.tsx"
touch "$FEATURES_DIR/field/pages/JobDetailPage.tsx"
touch "$FEATURES_DIR/field/pages/JobCompletionFlow.tsx"
touch "$FEATURES_DIR/field/pages/RouteView.tsx"
touch "$FEATURES_DIR/field/pages/TechStatsPage.tsx"
touch "$FEATURES_DIR/field/pages/TechProfilePage.tsx"

mkdir -p "$FEATURES_DIR/field/components/PhotoCapture"
mkdir -p "$FEATURES_DIR/field/components/SignaturePad"
touch "$FEATURES_DIR/field/components/JobCard.tsx"
touch "$FEATURES_DIR/field/components/QuickActionBar.tsx"
touch "$FEATURES_DIR/field/components/OfflineSyncStatus.tsx"
touch "$FEATURES_DIR/field/components/WorkflowStepper.tsx"

mkdir -p "$FEATURES_DIR/field/hooks"
touch "$FEATURES_DIR/field/hooks/useMyJobs.ts"
touch "$FEATURES_DIR/field/hooks/useJobDetail.ts"
touch "$FEATURES_DIR/field/hooks/useOfflineSync.ts"
touch "$FEATURES_DIR/field/hooks/useRoute.ts"
touch "$FEATURES_DIR/field/hooks/useTechStats.ts"

mkdir -p "$FEATURES_DIR/field/stores"
touch "$FEATURES_DIR/field/stores/fieldStore.ts"
touch "$FEATURES_DIR/field/stores/offlineSyncStore.ts"
touch "$FEATURES_DIR/field/stores/routeStore.ts"

mkdir -p "$FEATURES_DIR/field/utils"
touch "$FEATURES_DIR/field/utils/jobHelpers.ts"
touch "$FEATURES_DIR/field/utils/routeOptimizer.ts"
touch "$FEATURES_DIR/field/utils/geoHelpers.ts"

mkdir -p "$FEATURES_DIR/field/api"
touch "$FEATURES_DIR/field/api/fieldHooks.ts"

touch "$FEATURES_DIR/field/FieldLayout.tsx"
touch "$FEATURES_DIR/field/index.ts"

echo "✓ Field Service directories created"

# ============================================================================
# 2. COMMUNICATIONS FEATURE
# ============================================================================

echo "📦 Creating Communications Feature..."

mkdir -p "$FEATURES_DIR/communications/pages"
touch "$FEATURES_DIR/communications/pages/CommunicationsOverview.tsx"
touch "$FEATURES_DIR/communications/pages/SMSInbox.tsx"
touch "$FEATURES_DIR/communications/pages/SMSConversation.tsx"
touch "$FEATURES_DIR/communications/pages/EmailInbox.tsx"
touch "$FEATURES_DIR/communications/pages/EmailConversation.tsx"
touch "$FEATURES_DIR/communications/pages/AllTemplates.tsx"
touch "$FEATURES_DIR/communications/pages/SMSTemplates.tsx"
touch "$FEATURES_DIR/communications/pages/EmailTemplates.tsx"
touch "$FEATURES_DIR/communications/pages/ReminderConfig.tsx"
touch "$FEATURES_DIR/communications/pages/ReminderDetail.tsx"

mkdir -p "$FEATURES_DIR/communications/components/MessageThread"
mkdir -p "$FEATURES_DIR/communications/components/TemplateEditor"
mkdir -p "$FEATURES_DIR/communications/components/ReminderConfig"
mkdir -p "$FEATURES_DIR/communications/components/InboxView"
mkdir -p "$FEATURES_DIR/communications/components/OverviewDashboard"

mkdir -p "$FEATURES_DIR/communications/hooks"
touch "$FEATURES_DIR/communications/hooks/useSMSInbox.ts"
touch "$FEATURES_DIR/communications/hooks/useSMSConversation.ts"
touch "$FEATURES_DIR/communications/hooks/useEmailInbox.ts"
touch "$FEATURES_DIR/communications/hooks/useMessageTemplates.ts"
touch "$FEATURES_DIR/communications/hooks/useReminders.ts"
touch "$FEATURES_DIR/communications/hooks/useUnreadCount.ts"

mkdir -p "$FEATURES_DIR/communications/stores"
touch "$FEATURES_DIR/communications/stores/messagingStore.ts"
touch "$FEATURES_DIR/communications/stores/templateStore.ts"
touch "$FEATURES_DIR/communications/stores/reminderStore.ts"

mkdir -p "$FEATURES_DIR/communications/types"
touch "$FEATURES_DIR/communications/types/sms.ts"
touch "$FEATURES_DIR/communications/types/email.ts"
touch "$FEATURES_DIR/communications/types/template.ts"
touch "$FEATURES_DIR/communications/types/reminder.ts"

touch "$FEATURES_DIR/communications/index.ts"

echo "✓ Communications directories created"

# ============================================================================
# 3. BILLING FEATURE
# ============================================================================

echo "📦 Creating Billing Feature..."

mkdir -p "$FEATURES_DIR/billing/pages"
touch "$FEATURES_DIR/billing/pages/BillingOverview.tsx"
touch "$FEATURES_DIR/billing/pages/EstimatesPage.tsx"
touch "$FEATURES_DIR/billing/pages/EstimateDetailPage.tsx"
touch "$FEATURES_DIR/billing/pages/PaymentPlansPage.tsx"
touch "$FEATURES_DIR/billing/pages/PublicPaymentPage.tsx"

mkdir -p "$FEATURES_DIR/billing/components/BillingKPIs"
mkdir -p "$FEATURES_DIR/billing/components/EstimateBuilder"
mkdir -p "$FEATURES_DIR/billing/components/PaymentLinkGenerator"
mkdir -p "$FEATURES_DIR/billing/components/PublicPaymentForm"

mkdir -p "$FEATURES_DIR/billing/hooks"
touch "$FEATURES_DIR/billing/hooks/useBillingDashboard.ts"
touch "$FEATURES_DIR/billing/hooks/useEstimates.ts"
touch "$FEATURES_DIR/billing/hooks/usePaymentLinks.ts"
touch "$FEATURES_DIR/billing/hooks/usePaymentPlans.ts"

touch "$FEATURES_DIR/billing/index.ts"

echo "✓ Billing directories created"

# ============================================================================
# 4. WORK ORDERS VIEWS
# ============================================================================

echo "📦 Creating Work Orders Views..."

mkdir -p "$FEATURES_DIR/workorders/views"
touch "$FEATURES_DIR/workorders/views/CalendarView.tsx"
touch "$FEATURES_DIR/workorders/views/KanbanBoard.tsx"
touch "$FEATURES_DIR/workorders/views/MapView.tsx"

echo "✓ Work Orders views created"

# ============================================================================
# 5. SHARED COMPONENTS
# ============================================================================

echo "📦 Creating Shared Components..."

mkdir -p "$COMPONENTS_DIR/shared/SignaturePad"
touch "$COMPONENTS_DIR/shared/SignaturePad/SignaturePad.tsx"
touch "$COMPONENTS_DIR/shared/SignaturePad/index.ts"

mkdir -p "$COMPONENTS_DIR/shared/maps"
touch "$COMPONENTS_DIR/shared/maps/index.ts"

echo "✓ Shared components created"

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "✅ Feature Scaffold Complete!"
echo ""
echo "📋 Created:"
echo "  - Field Service: 21 files"
echo "  - Communications: 25 files"
echo "  - Billing: 9 files"
echo "  - Work Orders Views: 3 files"
echo "  - Shared Components: 4 files"
echo ""
echo "🎯 Next Steps:"
echo "  1. Run: npm run build"
echo "  2. Add routes to src/routes/index.tsx"
echo "  3. Update sidebar in AppLayout.tsx"
echo ""
