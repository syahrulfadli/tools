import { useEffect, useRef, type PointerEvent } from "react";
import { drawStrokes } from "../lib/render";
import type { Stroke } from "../lib/signature";

/**
 * Kanvas untuk menggambar tanda tangan dengan mouse, jari, atau pena. Goresan disimpan sebagai
 * titik (px CSS) di state induk, sehingga warna dan tebal bisa diganti tanpa menggambar ulang.
 */
export function SignaturePad({ strokes, color, lineWidth, onChange }: { strokes: Stroke[]; color: string; lineWidth: number; onChange: (strokes: Stroke[]) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Stroke | null>(null);
  const latest = useRef(strokes);
  latest.current = strokes;

  // Gambar ulang saat goresan/gaya berubah atau ukuran kanvas berubah (rotasi ponsel, tata letak).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paint = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      drawStrokes(ctx, drawing.current ? [...latest.current, drawing.current] : latest.current, color, lineWidth);
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [strokes, color, lineWidth]);

  const point = (event: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [Math.round((event.clientX - rect.left) * 10) / 10, Math.round((event.clientY - rect.top) * 10) / 10];
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(ratio, ratio);
    drawStrokes(ctx, drawing.current ? [...latest.current, drawing.current] : latest.current, color, lineWidth);
  };

  return (
    <div className="signature-pad">
      <canvas
        ref={canvasRef}
        aria-label="Area menggambar tanda tangan"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drawing.current = [point(event)];
          redraw();
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          drawing.current.push(point(event));
          redraw();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          const stroke = drawing.current;
          drawing.current = null;
          onChange([...latest.current, stroke]);
        }}
        onPointerCancel={() => {
          drawing.current = null;
          redraw();
        }}
      />
    </div>
  );
}
