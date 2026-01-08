/**
 * OfflineSignature - Canvas-based signature capture with offline support
 *
 * Features:
 * - Touch and mouse signature capture
 * - Store as base64 for later sync
 * - Works completely offline
 * - Clear and redo functionality
 * - Visual feedback for saved signatures
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useOnlineStatus } from '@/hooks/usePWA';
import { apiClient } from '@/api/client';
import {
  storeSignature,
  getSignatureForWorkOrder,
  updateSignatureStatus,
  removeSignature,
  type StoredSignature,
} from '@/lib/db';

// ============================================
// Types
// ============================================

interface OfflineSignatureProps {
  workOrderId: string;
  signerType: 'customer' | 'technician';
  onSignatureCapture?: (signatureData: string) => void;
  onSignatureUploaded?: () => void;
  label?: string;
}

interface Point {
  x: number;
  y: number;
}

// ============================================
// Signature Canvas Hook
// ============================================

function useSignatureCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPointRef = useRef<Point | null>(null);

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, [canvasRef]);

  const getPoint = useCallback(
    (e: MouseEvent | TouchEvent): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [canvasRef]
  );

  const startDrawing = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const point = getPoint(e);
      if (!point) return;

      const ctx = getCanvasContext();
      if (!ctx) return;

      setIsDrawing(true);
      lastPointRef.current = point;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    },
    [getPoint, getCanvasContext]
  );

  const draw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;

      const point = getPoint(e);
      if (!point) return;

      const ctx = getCanvasContext();
      if (!ctx) return;

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (lastPointRef.current) {
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }

      lastPointRef.current = point;
      setHasSignature(true);
    },
    [isDrawing, getPoint, getCanvasContext]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  }, [canvasRef, getCanvasContext]);

  const toDataURL = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return null;
    return canvas.toDataURL('image/png');
  }, [canvasRef, hasSignature]);

  // Set up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => startDrawing(e);
    const handleMouseMove = (e: MouseEvent) => draw(e);
    const handleMouseUp = () => stopDrawing();
    const handleMouseLeave = () => stopDrawing();

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      startDrawing(e);
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      draw(e);
    };
    const handleTouchEnd = () => stopDrawing();

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startDrawing, draw, stopDrawing, canvasRef]);

  return { hasSignature, clear, toDataURL };
}

// ============================================
// Main Component
// ============================================

export function OfflineSignature({
  workOrderId,
  signerType,
  onSignatureCapture,
  onSignatureUploaded,
  label,
}: OfflineSignatureProps) {
  const isOnline = useOnlineStatus();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { hasSignature, clear, toDataURL } = useSignatureCanvas(canvasRef);

  const [signerName, setSignerName] = useState('');
  const [existingSignature, setExistingSignature] = useState<StoredSignature | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Load existing signature
  useEffect(() => {
    async function loadExisting() {
      const sig = await getSignatureForWorkOrder(workOrderId);
      if (sig && sig.signerType === signerType) {
        setExistingSignature(sig);
        setSignerName(sig.signerName);
      }
    }
    loadExisting();
  }, [workOrderId, signerType]);

  // Upload signature
  const uploadSignature = useCallback(
    async (signature: StoredSignature) => {
      setIsUploading(true);
      try {
        await apiClient.post(`/work-orders/${workOrderId}/signature`, {
          signature_data: signature.signatureData,
          signer_name: signature.signerName,
          signer_type: signature.signerType,
        });
        await updateSignatureStatus(signature.id, 'uploaded');
        onSignatureUploaded?.();
        return true;
      } catch (err) {
        console.error('Signature upload failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        await updateSignatureStatus(signature.id, 'failed', errorMessage);
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [workOrderId, onSignatureUploaded]
  );

  // Auto-upload pending signature when coming online
  useEffect(() => {
    if (isOnline && existingSignature?.status === 'pending') {
      uploadSignature(existingSignature);
    }
  }, [isOnline, existingSignature, uploadSignature]);

  // Save signature
  const handleSave = useCallback(async () => {
    if (!hasSignature || !signerName.trim()) {
      alert('Please sign and enter your name');
      return;
    }

    const signatureData = toDataURL();
    if (!signatureData) return;

    setIsSaving(true);

    try {
      // Remove existing signature if any
      if (existingSignature) {
        await removeSignature(existingSignature.id);
      }

      // Store new signature
      await storeSignature({
        workOrderId,
        signatureData,
        signerName: signerName.trim(),
        signerType,
        capturedAt: Date.now(),
      });

      const newSig = await getSignatureForWorkOrder(workOrderId);
      setExistingSignature(newSig || null);

      onSignatureCapture?.(signatureData);

      // Show saved feedback
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);

      // Upload if online
      if (isOnline && newSig) {
        uploadSignature(newSig);
      }
    } catch (err) {
      console.error('Failed to save signature:', err);
      alert('Failed to save signature. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [
    hasSignature,
    signerName,
    toDataURL,
    workOrderId,
    signerType,
    existingSignature,
    onSignatureCapture,
    isOnline,
    uploadSignature,
  ]);

  // Clear signature
  const handleClear = useCallback(async () => {
    clear();
    setSignerName('');
    if (existingSignature) {
      await removeSignature(existingSignature.id);
      setExistingSignature(null);
    }
  }, [clear, existingSignature]);

  // ============================================
  // Render
  // ============================================

  const displayLabel = label || (signerType === 'customer' ? 'Customer Signature' : 'Technician Signature');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{displayLabel}</CardTitle>
          <div className="flex items-center gap-2">
            {existingSignature?.status === 'pending' && (
              <Badge variant="warning">Pending Upload</Badge>
            )}
            {existingSignature?.status === 'uploaded' && (
              <Badge variant="success">Saved</Badge>
            )}
            {existingSignature?.status === 'failed' && (
              <Badge variant="danger">Upload Failed</Badge>
            )}
            {showSaved && (
              <Badge variant="success">Saved!</Badge>
            )}
            {!isOnline && (
              <Badge variant="default">Offline</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Signature canvas */}
        <div className="border border-border-primary rounded-lg bg-white mb-4">
          {existingSignature?.status === 'uploaded' ? (
            // Show saved signature image
            <div className="relative">
              <img
                src={existingSignature.signatureData}
                alt="Signature"
                className="w-full h-32 object-contain"
              />
              <div className="absolute bottom-2 right-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full h-32 touch-none cursor-crosshair"
              style={{ touchAction: 'none' }}
            />
          )}
        </div>

        {/* Signer name input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Print Name
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Enter full name"
            className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={existingSignature?.status === 'uploaded'}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {existingSignature?.status !== 'uploaded' && (
            <>
              <Button
                onClick={handleSave}
                disabled={!hasSignature || !signerName.trim() || isSaving}
                size="sm"
              >
                {isSaving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Signature'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleClear}
                disabled={!hasSignature && !existingSignature}
                size="sm"
              >
                Clear
              </Button>
            </>
          )}

          {existingSignature?.status === 'failed' && isOnline && (
            <Button
              variant="secondary"
              onClick={() => uploadSignature(existingSignature)}
              disabled={isUploading}
              size="sm"
            >
              Retry Upload
            </Button>
          )}
        </div>

        {/* Offline notice */}
        {!isOnline && (
          <p className="text-xs text-yellow-600 mt-2">
            Signature will be uploaded when you&apos;re back online
          </p>
        )}

        {/* Instructions */}
        {!existingSignature && !hasSignature && (
          <p className="text-xs text-text-muted mt-2">
            Sign using your finger or mouse in the box above
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default OfflineSignature;
