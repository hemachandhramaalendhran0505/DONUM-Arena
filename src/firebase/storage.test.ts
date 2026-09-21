/**
 * Upload validation (§11).
 *
 * `accept="image/*"` on a file input is a hint the browser is free to ignore —
 * drag-and-drop and "all files" both bypass it. These tests cover the actual
 * guard, including the limits mirrored in storage.rules.
 */
import { describe, expect, it } from 'vitest';

import {
  ACCEPTED_IMAGE_TYPES,
  InvalidImageError,
  MAX_UPLOAD_BYTES,
  partitionImages,
  validateImage,
} from '@/firebase/storage';

function fakeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  // File.size is read-only, so redefine it rather than allocating real bytes.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateImage', () => {
  it('accepts the supported image formats', () => {
    for (const type of ACCEPTED_IMAGE_TYPES) {
      expect(() => validateImage(fakeFile(`photo.${type.split('/')[1]}`, type, 1024))).not.toThrow();
    }
  });

  it('rejects a non-image file even when it is named like one', () => {
    // The realistic attack/mistake: "photo.jpg" that is actually a PDF.
    expect(() => validateImage(fakeFile('photo.jpg', 'application/pdf', 1024))).toThrow(
      InvalidImageError,
    );
  });

  it('rejects an executable', () => {
    expect(() =>
      validateImage(fakeFile('setup.exe', 'application/x-msdownload', 2048)),
    ).toThrow(InvalidImageError);
  });

  it('rejects files over the 5 MB limit enforced by storage rules', () => {
    expect(() => validateImage(fakeFile('huge.jpg', 'image/jpeg', MAX_UPLOAD_BYTES + 1))).toThrow(
      /5 MB/,
    );
    // Exactly at the limit is allowed.
    expect(() => validateImage(fakeFile('edge.jpg', 'image/jpeg', MAX_UPLOAD_BYTES))).not.toThrow();
  });

  it('rejects an empty file', () => {
    expect(() => validateImage(fakeFile('empty.png', 'image/png', 0))).toThrow(InvalidImageError);
  });

  it('explains why a file was rejected, naming it', () => {
    try {
      validateImage(fakeFile('resume.pdf', 'application/pdf', 100));
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as Error).message).toContain('resume.pdf');
      expect((err as Error).message).toMatch(/JPEG|PNG|WebP|GIF/);
    }
  });
});

describe('partitionImages', () => {
  it('keeps valid files and reports the rejected ones', () => {
    const { accepted, errors } = partitionImages([
      fakeFile('good.jpg', 'image/jpeg', 2048),
      fakeFile('bad.pdf', 'application/pdf', 2048),
      fakeFile('huge.png', 'image/png', MAX_UPLOAD_BYTES + 1),
    ]);

    // One bad file must not discard the whole selection.
    expect(accepted.map((f) => f.name)).toEqual(['good.jpg']);
    expect(errors).toHaveLength(2);
  });

  it('returns no errors for an all-valid selection', () => {
    const { accepted, errors } = partitionImages([
      fakeFile('a.jpg', 'image/jpeg', 1000),
      fakeFile('b.webp', 'image/webp', 1000),
    ]);
    expect(accepted).toHaveLength(2);
    expect(errors).toEqual([]);
  });
});
