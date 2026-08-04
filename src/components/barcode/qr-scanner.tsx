"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera } from "lucide-react";

export function QrScanner({
  active,
  onScan,
}: {
  active: boolean;
  onScan: (decodedText: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        scanLoop();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NotAllowed") || msg.includes("Permission")) {
          setError("Permite el acceso a la camara para escanear codigos.");
        } else {
          setError("No se pudo acceder a la camara.");
        }
      }
    }

    function scanLoop() {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scanLoop);
        return;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (result && result.data) {
        cancelled = true;
        onScan(result.data);
        return;
      }

      rafRef.current = requestAnimationFrame(scanLoop);
    }

    startCamera();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [active, onScan]);

  if (error) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        <div className="space-y-2">
          <Camera className="mx-auto size-8" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border aspect-video bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-48 rounded-lg border-2 border-white/60" />
      </div>
    </div>
  );
}
