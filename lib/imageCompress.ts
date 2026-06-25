// Client-only helper: shrink/recompress an image so it fits under a byte limit.
// Used by the photo capture/upload flow so large photos are optimized instead
// of rejected. Encodes to JPEG (fine for photos).

const MAX_DIMENSION = 1920; // cap the longest side before compressing
const QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5];
const MAX_ATTEMPTS = 6; // each attempt shrinks dimensions further

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  bitmap?: ImageBitmap;
}

async function decode(file: File): Promise<Decoded | null> {
  if (typeof createImageBitmap === "function") {
    try {
      // Bake in EXIF orientation so re-encoded photos aren't sideways.
      const bmp = await createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
      return { source: bmp, width: bmp.width, height: bmp.height, bitmap: bmp };
    } catch {
      try {
        const bmp = await createImageBitmap(file);
        return { source: bmp, width: bmp.width, height: bmp.height, bitmap: bmp };
      } catch {
        /* fall through to <img> */
      }
    }
  }
  try {
    const img = await loadImageElement(file);
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    return null;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
}

function blobToFile(blob: Blob, originalName: string): File {
  const base = originalName.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

/**
 * Returns a version of `file` no larger than `maxBytes`, downscaling and
 * lowering JPEG quality as needed. If the file is already small enough it's
 * returned unchanged. If it can't be decoded (e.g. some HEIC), the original is
 * returned and the caller/server enforces the limit.
 */
export async function compressImageToLimit(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file;

  const decoded = await decode(file);
  if (!decoded) return file;

  const { source, width, height, bitmap } = decoded;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap?.close();
    return file;
  }

  let scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  let best: Blob | null = null;

  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(source, 0, 0, w, h);

      for (const q of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, q);
        if (!blob) continue;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= maxBytes) return blobToFile(blob, file.name);
      }
      scale *= 0.8; // still too big — shrink dimensions and retry qualities
    }
  } finally {
    bitmap?.close();
  }

  // Best effort: return the smallest we produced (rarely still over the limit).
  return best ? blobToFile(best, file.name) : file;
}
