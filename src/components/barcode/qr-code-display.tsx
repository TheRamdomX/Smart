"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QrCodeDisplay({
  value,
  productName,
  size = 200,
}: {
  value: string;
  productName: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
    });
  }, [value, size]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${productName.replace(/\s+/g, "-")}-${value}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} className="rounded-md border" />
      <p className="text-center text-xs text-muted-foreground font-mono">
        {value}
      </p>
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Download className="size-4" />
        Descargar QR
      </Button>
    </div>
  );
}
