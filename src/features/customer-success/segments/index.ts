/**
 * Segments Module Exports
 *
 * World-class visual segment builder with AI-powered natural language interface.
 * Plus AI Guide, bulk actions and platform integration components.
 */

// Visual Segment Builder - Main pages
export { SegmentsPage } from "./SegmentsPage.tsx";
export { SegmentBuilder } from "./SegmentBuilder.tsx";
export { SegmentDetail } from "./SegmentDetail.tsx";
export { AISegmentChat, AISegmentChatCompact } from "./AISegmentChat.tsx";

// Visual Segment Builder - Components
export {
  FieldPicker,
  getFieldById,
  SEGMENT_FIELDS,
} from "./components/FieldPicker.tsx";
export type {
  FieldDefinition,
  FieldCategory,
} from "./components/FieldPicker.tsx";
export {
  OperatorSelect,
  getOperatorById,
  operatorNeedsSecondValue,
  operatorNeedsNoValue,
} from "./components/OperatorSelect.tsx";
export { ValueInput } from "./components/ValueInput.tsx";
export {
  RuleBuilder,
  createEmptyRule,
  validateRule,
  formatRuleDescription,
} from "./components/RuleBuilder.tsx";
export {
  RuleGroup,
  RuleSummary,
  createEmptyRuleSet,
  validateRuleSet,
} from "./components/RuleGroup.tsx";
export { SegmentCard, SegmentCardCompact } from "./components/SegmentCard.tsx";
export {
  SegmentInsight,
  SegmentInsightCompact,
  AISuggestionsPanel,
} from "./components/SegmentInsight.tsx";

// AI Guide - Friendly customer finder
export { AIGuide, default } from "./AIGuide.tsx";
export { GuidedTour } from "./GuidedTour.tsx";
export {
  JargonTranslator,
  JargonTooltip,
  withJargonTooltips,
} from "./JargonTranslator.tsx";
export { SimpleResultCard, CompactResultCard } from "./SimpleResultCard.tsx";
export type { CustomerResult } from "./SimpleResultCard.tsx";
export { ActionWizard } from "./ActionWizard.tsx";
export type { ActionType } from "./ActionWizard.tsx";

// Bulk Actions
export { BulkActionsMenu } from "./BulkActionsMenu.tsx";
export { ExportModal } from "./ExportModal.tsx";
export type { ExportOptions } from "./ExportModal.tsx";
export { BulkScheduleModal } from "./BulkScheduleModal.tsx";
export type { BulkScheduleOptions } from "./BulkScheduleModal.tsx";
