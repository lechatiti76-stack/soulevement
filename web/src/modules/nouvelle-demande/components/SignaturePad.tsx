"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SignaturePad({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !value) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = value;
  }, [value]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const dataUrl = canvasRef.current?.toDataURL("image/png");
    if (dataUrl) onChange(dataUrl);
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="touch-none rounded-xl border border-[rgb(var(--border))] bg-white"
      />
      <button
        type="button"
        onClick={clear}
        className="mt-1 text-xs text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
      >
        Effacer
      </button>
    </div>
  );
}
