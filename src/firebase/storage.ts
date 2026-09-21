/**
 * Image uploads.
 *
 * Firebase Storage is used when configured; otherwise images are converted to
 * compressed data URLs and kept with the record so uploads still work offline.
 */
import { isFirebaseConfigured } from './config';
import { getStorageInstance } from './app';

const MAX_DIMENSION = 1280;
const QUALITY = 0.72;

/** Must stay <= the limit in storage.rules, which rejects >5 MB server-side. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export class InvalidImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidImageError';
  }
}

/**
 * Validate a file before it is read or uploaded.
 *
 * The `accept` attribute on a file input is a browser hint, not a guarantee:
 * it can be bypassed by drag-and-drop or by choosing "all files". Without this
 * check an oversized or non-image file is only rejected by Storage rules,
 * surfacing as an opaque failure after the upload has already been attempted.
 */
export function validateImage(file: File): void {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new InvalidImageError(
      `${file.name || 'That file'} is not a supported image. Use JPEG, PNG, WebP or GIF.`,
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new InvalidImageError(`${file.name || 'That image'} is ${mb} MB. The limit is 5 MB.`);
  }
  if (file.size === 0) {
    throw new InvalidImageError(`${file.name || 'That file'} is empty.`);
  }
}

/** Partition a selection into accepted files and human-readable rejections. */
export function partitionImages(files: File[]): { accepted: File[]; errors: string[] } {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      validateImage(file);
      accepted.push(file);
    } catch (err) {
      errors.push(err instanceof InvalidImageError ? err.message : `${file.name} was rejected.`);
    }
  }
  return { accepted, errors };
}

/** Downscale + compress in the browser before any upload. Saves bandwidth and storage cost. */
export async function compressImage(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || !file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload one image and return its public URL.
 * @param path storage path, e.g. `donations/{donationId}/{filename}`
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  validateImage(file);
  const compressed = await compressImage(file);

  if (!isFirebaseConfigured) {
    return blobToDataUrl(compressed);
  }

  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storage = await getStorageInstance();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

export async function uploadImages(files: File[], folder: string): Promise<string[]> {
  return Promise.all(
    files.map((file, i) => uploadImage(file, `${folder}/${Date.now()}-${i}-${file.name}`)),
  );
}
