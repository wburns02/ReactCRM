import { useState } from 'react';
import { Button } from '@/components/ui/Button.tsx';
import { useInitiateCall, useMyExtension } from '../api.ts';
import type { InitiateCallRequest } from '../types.ts';

interface DialButtonProps {
  phoneNumber: string;
  customerId?: string;
  prospectId?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Click-to-call button that initiates a call via RingCentral
 * Renders inline next to phone numbers
 */
export function DialButton({
  phoneNumber,
  customerId,
  prospectId,
  variant = 'secondary',
  size = 'sm',
  className,
}: DialButtonProps) {
  const [isDialing, setIsDialing] = useState(false);
  const initiateMutation = useInitiateCall();
  const { data: myExtension } = useMyExtension();

  const handleCall = async () => {
    setIsDialing(true);

    const request: InitiateCallRequest = {
      to_number: phoneNumber,
      // Use the current user's own extension
      from_number: myExtension?.extension_number,
    };

    if (customerId) {
      request.customer_id = customerId;
    }
    if (prospectId) {
      request.prospect_id = prospectId;
    }

    try {
      await initiateMutation.mutateAsync(request);
    } catch (error) {
      console.error('Failed to initiate call:', error);
    } finally {
      setIsDialing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCall}
      disabled={isDialing || initiateMutation.isPending}
      className={className}
      title="Click to call"
    >
      {isDialing ? '...' : '📞'}
    </Button>
  );
}
