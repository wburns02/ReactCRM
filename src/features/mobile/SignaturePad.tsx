import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface SignaturePadProps {
  title?: string;
  onSave: (signatureData: string) => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
}

/**
 * Canvas-based signature capture component
 */
export function SignaturePad({
  title = "Signature",
  onSave,
  onCancel,
  width = 400,
  height = 200,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width, height });

  // Update canvas size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        if (container) {
          const containerWidth = container.clientWidth;
          setCanvasSize({
            width: Math.min(containerWidth - 32, width),
            height,
          });
        }
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [width, height]);

  /**
   * Get drawing context
   */
  const getContext = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Configure drawing style
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    return ctx;
  };

  /**
   * Get coordinates relative to canvas
   */
  const getCoordinates = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ("touches" in event) {
      if (event.touches.length === 0) return null;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  /**
   * Start drawing
   */
  const startDrawing = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    event.preventDefault();
    const coords = getCoordinates(event);
    if (!coords) return;

    const ctx = getContext();
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  /**
   * Draw line
   */
  const draw = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    event.preventDefault();
    if (!isDrawing) return;

    const coords = getCoordinates(event);
    if (!coords) return;

    const ctx = getContext();
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  /**
   * Stop drawing
   */
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  /**
   * Clear canvas
   */
  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  /**
   * Save signature as base64 PNG
   */
  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const signatureData = canvas.toDataURL("image/png");
    onSave(signatureData);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-text-primary">{title}</h3>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {/* Instructions */}
        <p className="text-sm text-text-secondary">
          Sign in the box below using your finger or mouse
        </p>

        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="border-2 border-border rounded-lg bg-white touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {/* X mark to sign */}
          {!hasSignature && (
            <div className="absolute bottom-4 left-4 text-text-muted text-xl pointer-events-none">
              X ___________________
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={clear}
            disabled={!hasSignature}
            className="flex-1"
          >
            Clear
          </Button>
          <Button
            variant="primary"
            onClick={save}
            disabled={!hasSignature}
            className="flex-1"
          >
            Save Signature
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Customer signature pad
 */
export function CustomerSignaturePad({
  onSave,
  onCancel,
}: {
  onSave: (signatureData: string) => void;
  onCancel?: () => void;
}) {
  return (
    <SignaturePad
      title="Customer Signature"
      onSave={onSave}
      onCancel={onCancel}
    />
  );
}

/**
 * Technician signature pad
 */
export function TechnicianSignaturePad({
  onSave,
  onCancel,
}: {
  onSave: (signatureData: string) => void;
  onCancel?: () => void;
}) {
  return (
    <SignaturePad
      title="Technician Signature"
      onSave={onSave}
      onCancel={onCancel}
    />
  );
}
