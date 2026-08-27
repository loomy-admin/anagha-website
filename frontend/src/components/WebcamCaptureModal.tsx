'use client';

import { useEffect, useRef, useState } from 'react';
import { compressVideoFrame } from '@/lib/imageCapture';

export default function WebcamCaptureModal({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, fileName: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setBlocked(false);
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (!cancelled) {
          setBlocked(true);
          setError('Camera access was blocked or is unavailable.');
        }
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  async function snap() {
    if (!videoRef.current || busy) return;
    setBusy(true);
    try {
      setError(null);
      const compressed = compressVideoFrame(videoRef.current);
      onCapture(compressed.dataUrl, compressed.fileName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capture failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] p-5 w-full max-w-lg space-y-4">
        <h3 className="text-navy font-black text-xs uppercase tracking-widest">Camera</h3>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full rounded-2xl bg-black aspect-video object-cover"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full border border-gray-200 text-[10px] font-black uppercase tracking-widest text-navy"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || blocked}
            onClick={() => void snap()}
            className="px-5 py-2 rounded-full bg-navy text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            {busy ? 'Capturing…' : 'Take photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
