const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.88;

export const MAX_PRODUCT_IMAGES = 10;

export function usesNativeCamera() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isWindows = /Windows/i.test(ua);
  const isPhoneOrTablet =
    /iPhone|iPad|iPod|Android/i.test(ua) || (navigator.maxTouchPoints > 1 && !isWindows);
  return isPhoneOrTablet && !isWindows;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return canvas.toDataURL('image/jpeg', quality);
}

function drawScaled(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  quality: number,
) {
  const longest = Math.max(srcW, srcH) || 1;
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not compress image');
  ctx.drawImage(source, 0, 0, width, height);
  return canvasToJpeg(canvas, quality);
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The source image could not be decoded.'));
    img.src = src;
  });
}

async function bitmapFromBlob(blob: Blob) {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    return createImageBitmap(blob);
  }
}

export async function compressImageFile(file: File, quality = JPEG_QUALITY) {
  const bitmap = await bitmapFromBlob(file);
  try {
    return {
      dataUrl: drawScaled(bitmap, bitmap.width, bitmap.height, quality),
      fileName: file.name.replace(/\.[^.]+$/, '') + '.jpg',
    };
  } finally {
    bitmap.close?.();
  }
}

export async function compressImageDataUrl(dataUrl: string, fileName = 'capture.jpg', quality = JPEG_QUALITY) {
  const img = await loadImageElement(dataUrl);
  return {
    dataUrl: drawScaled(img, img.naturalWidth || img.width, img.naturalHeight || img.height, quality),
    fileName: fileName.replace(/\.[^.]+$/, '') + '.jpg',
  };
}

/** Scale the live frame to ≤1600px JPEG 0.88 — no data-URL fetch/decode. */
export function compressVideoFrame(video: HTMLVideoElement, quality = JPEG_QUALITY) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) throw new Error('Camera is not ready yet. Try again in a moment.');
  return {
    dataUrl: drawScaled(video, w, h, quality),
    fileName: `webcam_${Date.now()}.jpg`,
  };
}
