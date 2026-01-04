/**
 * UI Components - Central export file
 *
 * Import components from this file for cleaner imports:
 * import { Button, Input, Card, Pagination } from '@/components/ui';
 */

// Form Controls
export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Label } from './Label';
export type { LabelProps } from './Label';

export { Select } from './Select';
export type { SelectProps } from './Select';

export { Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';

export {
  FormField,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormRadioGroup,
} from './FormField';

// Layout Components
export { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';

// Feedback & Status
export { Badge } from './Badge';
export type { BadgeProps } from './Badge';

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonListItem,
  SkeletonForm,
} from './Skeleton';

export { ApiError } from './ApiError';

export {
  ToastProvider,
  useToast,
  showToast,
  toastSuccess,
  toastError,
  toastWarning,
  toastInfo,
} from './Toast';
export type { Toast, ToastVariant } from './Toast';

export { Tooltip } from './Tooltip';

// Overlays & Dialogs
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  ConfirmDialog,
} from './Dialog';
export type {
  DialogProps,
  DialogContentProps,
  DialogHeaderProps,
  DialogBodyProps,
  DialogFooterProps,
  ConfirmDialogProps,
} from './Dialog';

export {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from './Dropdown';

// Navigation
export { Tabs, TabList, TabTrigger, TabContent } from './Tabs';

export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';

export { Breadcrumb, BreadcrumbSeparator } from './Breadcrumb';
export type { BreadcrumbProps, BreadcrumbItem } from './Breadcrumb';

// Data Display
export { VirtualList } from './VirtualList';

// Media & Input
export { VoiceNotesInput } from './VoiceNotesInput';

// Connection Status
export {
  ConnectionStatus,
  ConnectionStatusExtended,
  ConnectionDot,
} from './ConnectionStatus';
export type {
  ConnectionState,
  ConnectionStatusProps,
  ConnectionStatusExtendedProps,
  ConnectionDotProps,
} from './ConnectionStatus';
