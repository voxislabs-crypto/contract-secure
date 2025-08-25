import React, { useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, X } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  initialValue?: string;
  width?: number;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
  clearOnResize?: boolean;
  className?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  initialValue,
  width = 400,
  height = 200,
  penColor = 'black',
  backgroundColor = 'white',
  clearOnResize = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = React.useState(true);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Set styles
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw initial value if provided
    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setIsEmpty(false);
      };
      img.src = initialValue;
    }

    // Handle window resize
    const handleResize = () => {
      if (clearOnResize) {
        clear();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height, penColor, initialValue, clearOnResize]);

  // Drawing functions
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const point = getPoint(e);
    if (point) {
      lastPoint.current = point;
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPoint.current) return;

    const point = getPoint(e);
    if (!point) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPoint.current = point;
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    lastPoint.current = null;
    saveSignature();
  };

  const getPoint = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      // Touch event
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate canvas coordinates
    const x = ((clientX - rect.left) / rect.width) * width;
    const y = ((clientY - rect.top) / rect.height) * height;

    return { x, y };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    setIsEmpty(true);
  };

  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  }, [onSave, isEmpty]);

  // Handle touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startDrawing(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    draw(e);
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className="relative border rounded-md overflow-hidden"
        style={{ width: `${width}px`, height: `${height}px`, backgroundColor }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={stopDrawing}
          className="touch-none"
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
            Sign here
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={isEmpty}
          className="gap-1"
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
};
