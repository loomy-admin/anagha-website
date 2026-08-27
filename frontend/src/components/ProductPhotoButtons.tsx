'use client';

import { useRef, useState } from 'react';
import WebcamCaptureModal from '@/components/WebcamCaptureModal';
import { compressImageFile, usesNativeCamera } from '@/lib/imageCapture';

const btn =
  'bg-navy text-white px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest disabled:opacity-40';

export default function ProductPhotoButtons({
  disabled,
  onReady,
}: {
  disabled?: boolean;
  onReady: (dataUrl: string, fileName: string) => void | Promise<void>;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const native = usesNativeCamera();

  async function fromFile(file: File | null) {
    if (!file) return;
    const compressed = await compressImageFile(file);
    await onReady(compressed.dataUrl, compressed.fileName);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled} className={btn} onClick={() => galleryRef.current?.click()}>
        Gallery
      </button>
      <button
        type="button"
        disabled={disabled}
        className={btn}
        onClick={() => {
          if (native) cameraRef.current?.click();
          else setWebcamOpen(true);
        }}
      >
        Camera
      </button>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0] || null;
          e.target.value = '';
          try {
            await fromFile(file);
          } catch (err) {
            console.error(err);
          }
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0] || null;
          e.target.value = '';
          try {
            await fromFile(file);
          } catch (err) {
            console.error(err);
          }
        }}
      />
      <WebcamCaptureModal
        open={webcamOpen}
        onClose={() => setWebcamOpen(false)}
        onCapture={(dataUrl, fileName) => void onReady(dataUrl, fileName)}
      />
    </div>
  );
}
