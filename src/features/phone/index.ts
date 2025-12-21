/**
 * Phone/RingCentral integration module
 * Exports all public components and hooks
 */

export { DialButton } from './components/DialButton.tsx';
export { DialerModal } from './components/DialerModal.tsx';
export { CallDispositionModal } from './components/CallDispositionModal.tsx';
export { RCStatusIndicator } from './components/RCStatusIndicator.tsx';
export { CallLog } from './components/CallLog.tsx';

export {
  useRCStatus,
  useInitiateCall,
  useCallLog,
  useDispositions,
  useLogDisposition,
} from './api.ts';

export type {
  RCStatus,
  CallRecord,
  Disposition,
  CallDirection,
  DispositionCategory,
  InitiateCallRequest,
  LogDispositionRequest,
} from './types.ts';
