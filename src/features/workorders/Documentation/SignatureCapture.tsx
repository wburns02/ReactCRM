/**
 * SignatureCapture Component
 *
 * Canvas-based digital signature pad for work order documentation.
 * Features:
 * - Canvas-based touch/mouse drawing
 * - Clear button
 * - Save as base64 PNG
 * - Props: type (customer|technician), onSave, existingSignature
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { cn } from '@/lib/utils';
import type { SignatureType } from '@/api/types/workOrder';

export interface SignatureData {
  data: string;
  signerName: string;
  timestamp: string;
}

export interface SignatureCaptureProps {
  type: SignatureType;
  onSave: (signature: SignatureData) => void;
  existingSignature?: string;
  signerName?: string;
  className?: string;
  disabled?: boolean;
}

interface Point {
  x: number;
  y: number;
}

export function SignatureCapture({
  type,
  onSave,
  existingSignature,
  signerName: initialSignerName = '',
  className,
  disabled = false,
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!existingSignature);
  const [signerName, setSignerName] = useState(initialSignerName);
  const lastPointRef = useRef<Point | null>(null);

  const typeLabel = type === 'customer' ? 'Customer' : 'Technician';

  /**
   * Initialize canvas with proper dimensions and draw existing signature if any
   */
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Get container dimensions
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas dimensions for high DPI displays
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Scale context for high DPI
    ctx.scale(dpr, dpr);

    // Set drawing styles
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw existing signature if provided
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = existingSignature;
    }
  }, [existingSignature]);

  // Initialize canvas on mount and resize
  useEffect(() => {
    initCanvas();

    const handleResize = () => {
      // Only reinitialize if there's no signature yet
      if (!hasSignature) {
        initCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas, hasSignature]);

  /**
   * Get point coordinates from event
   */
  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  /**
   * Draw line segment on canvas
   */
  const drawLine = useCallback((from: Point, to: Point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, []);

  /**
   * Handle pointer down (start drawing)
   */
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;

    e.preventDefault();
    setIsDrawing(true);
    const point = getPoint(e);
    lastPointRef.current = point;

    // Draw a dot for single taps
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!hasSignature) {
      setHasSignature(true);
    }
  }, [disabled, getPoint, hasSignature]);

  /**
   * Handle pointer move (continue drawing)
   */
  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;

    e.preventDefault();
    const point = getPoint(e);

    if (lastPointRef.current) {
      drawLine(lastPointRef.current, point);
    }

    lastPointRef.current = point;
  }, [isDrawing, disabled, getPoint, drawLine]);

  /**
   * Handle pointer up (stop drawing)
   */
  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  /**
   * Clear the signature canvas
   */
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    // Clear and redraw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    setHasSignature(false);
  }, []);

  /**
   * Save signature as base64 PNG
   */
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Validate signer name
    if (!signerName.trim()) {
      return;
    }

    // Convert canvas to base64 PNG
    const dataUrl = canvas.toDataURL('image/png');

    onSave({
      data: dataUrl,
      signerName: signerName.trim(),
      timestamp: new Date().toISOString(),
    });
  }, [signerName, onSave]);

  /**
   * Check if canvas is blank (all white pixels)
   */
  const isCanvasBlank = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return true;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Check if all pixels are white (255, 255, 255)
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
        return false;
      }
    }

    return true;
  }, []);

  const canSave = hasSignature && !isCanvasBlank() && signerName.trim().length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">
          {typeLabel} Signature
        </h3>
        {hasSignature && !disabled && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Clear
          </Button>
        )}
      </div>

      {/* Signer Name Input */}
      <div className="space-y-2">
        <Label htmlFor={`signer-name-${type}`}>
          {typeLabel} Name <span className="text-danger">*</span>
        </Label>
        <Input
          id={`signer-name-${type}`}
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder={`Enter ${typeLabel.toLowerCase()} name`}
          disabled={disabled}
          className={!signerName.trim() && hasSignature ? 'border-danger' : ''}
        />
        {!signerName.trim() && hasSignature && (
          <p className="text-xs text-danger">Please enter the {typeLabel.toLowerCase()} name to save the signature</p>
        )}
      </div>

      {/* Signature Canvas */}
      <div
        ref={containerRef}
        className={cn(
          'relative h-48 rounded-lg border-2 overflow-hidden',
          disabled ? 'border-border bg-bg-muted cursor-not-allowed' : 'border-border bg-white cursor-crosshair',
          !hasSignature && !disabled && 'border-dashed'
        )}
      >
        <canvas
          ref={canvasRef}
          className="touch-none"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        {/* Placeholder text */}
        {!hasSignature && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-text-muted">
              Sign here
            </span>
          </div>
        )}

        {/* Signature line */}
        <div className="absolute bottom-8 left-4 right-4 border-b border-border pointer-events-none" />
        <div className="absolute bottom-2 left-4 text-xs text-text-muted pointer-events-none">
          X
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-text-muted text-center">
        {disabled
          ? 'Signature capture is disabled'
          : 'Use your finger or mouse to sign above'}
      </p>

      {/* Save Button */}
      {!disabled && (
        <Button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Save Signature
        </Button>
      )}
    </div>
  );
}

export default SignatureCapture;
