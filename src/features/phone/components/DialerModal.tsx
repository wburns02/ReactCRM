import { useState } from 'react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { useInitiateCall } from '../api.ts';

interface DialerModalProps {
  open: boolean;
  onClose: () => void;
  customerId?: string;
  prospectId?: string;
}

/**
 * Full dialer pad modal for manual phone number entry
 */
export function DialerModal({ open, onClose, customerId, prospectId }: DialerModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const initiateMutation = useInitiateCall();

  const handleDigit = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPhoneNumber('');
  };

  const handleCall = async () => {
    if (!phoneNumber.trim()) return;

    try {
      await initiateMutation.mutateAsync({
        to_number: phoneNumber,
        customer_id: customerId,
        prospect_id: prospectId,
      });
      handleClear();
      onClose();
    } catch (error) {
      console.error('Failed to initiate call:', error);
    }
  };

  if (!open) return null;

  const digits = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bg-card rounded-lg shadow-xl p-6 w-80">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Phone Dialer</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Phone Number Display */}
        <div className="mb-4">
          <Input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Enter phone number"
            className="text-center text-lg font-mono"
          />
        </div>

        {/* Dialer Pad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {digits.map((row, rowIndex) => (
            row.map((digit) => (
              <button
                key={`${rowIndex}-${digit}`}
                onClick={() => handleDigit(digit)}
                className="h-14 rounded-lg bg-bg-hover hover:bg-bg-muted text-text-primary text-xl font-semibold transition-colors"
              >
                {digit}
              </button>
            ))
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-2">
          <Button
            variant="secondary"
            onClick={handleBackspace}
            className="flex-1"
            disabled={phoneNumber.length === 0}
          >
            Backspace
          </Button>
          <Button
            variant="secondary"
            onClick={handleClear}
            className="flex-1"
            disabled={phoneNumber.length === 0}
          >
            Clear
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleCall}
            className="flex-1"
            disabled={!phoneNumber.trim() || initiateMutation.isPending}
          >
            {initiateMutation.isPending ? 'Calling...' : 'Call'}
          </Button>
        </div>
      </div>
    </div>
  );
}
