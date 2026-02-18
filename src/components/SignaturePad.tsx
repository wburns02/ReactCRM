import { useRef, useEffect, useCallback, useState } from "react";

interface Props {
  onSignature: (base64: string) => void;
  width?: number;
  height?: number;
  className?: string;
}

export function SignaturePad({ onSignature, width, height = 150, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas to container width
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = width || container.clientWidth;
    canvas.width = w * 2; // 2x for retina
    canvas.height = height * 2;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(2, 2);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [width, height]);

  const getPoint = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const pt = getPoint(e);
    if (!pt) return;
    setIsDrawing(true);
    lastPoint.current = pt;
    setHasContent(true);
  }, [getPoint]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPoint.current) return;
    const pt = getPoint(e);
    if (!pt) return;

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPoint.current = pt;
  }, [isDrawing, getPoint]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
    setHasContent(false);
  }, []);

  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    const base64 = canvas.toDataURL("image/png");
    onSignature(base64);
  }, [hasContent, onSignature]);

  return (
    <div className={className}>
      <div ref={containerRef} className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          className="cursor-crosshair touch-none w-full"
        />
      </div>
      {!hasContent && (
        <p className="text-center text-text-tertiary text-xs mt-1">Sign above with your finger or mouse</p>
      )}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={clear}
          className="flex-1 py-2 text-sm border border-border rounded-lg text-text-secondary hover:bg-bg-hover active:scale-[0.98] transition-all"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasContent}
          className="flex-1 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          Confirm Signature
        </button>
      </div>
    </div>
  );
}
