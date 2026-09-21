/**
 * Coordinate handling (§18).
 *
 * The failure mode being guarded against is silent: a missing or malformed
 * coordinate used to produce NaN, and every comparison with NaN is false — so
 * the affected donation vanished from distance filters with no error anywhere.
 * `0,0` was worse, yielding a confident "8,663 km away".
 */
import { describe, expect, it } from 'vitest';

import {
  boundsOf,
  estimateMinutes,
  formatDistance,
  haversineKm,
  isValidCoordinate,
  roadDistanceKm,
} from '@/utils/geo';

const BENGALURU = { latitude: 12.9716, longitude: 77.5946 };
const INDIRANAGAR = { latitude: 12.9784, longitude: 77.6408 };

describe('isValidCoordinate', () => {
  it('accepts real coordinates', () => {
    expect(isValidCoordinate(BENGALURU)).toBe(true);
    expect(isValidCoordinate({ latitude: -33.87, longitude: 151.21 })).toBe(true);
  });

  it('rejects missing, null and non-numeric values', () => {
    expect(isValidCoordinate(undefined)).toBe(false);
    expect(isValidCoordinate(null)).toBe(false);
    expect(isValidCoordinate({})).toBe(false);
    expect(isValidCoordinate({ latitude: '12' as unknown as number, longitude: 77 })).toBe(false);
  });

  it('rejects NaN and Infinity', () => {
    expect(isValidCoordinate({ latitude: NaN, longitude: 77 })).toBe(false);
    expect(isValidCoordinate({ latitude: 12, longitude: Infinity })).toBe(false);
  });

  it('rejects out-of-range values', () => {
    expect(isValidCoordinate({ latitude: 91, longitude: 0.1 })).toBe(false);
    expect(isValidCoordinate({ latitude: 12, longitude: 181 })).toBe(false);
  });

  it('treats 0,0 as the missing-coordinate sentinel it usually is', () => {
    expect(isValidCoordinate({ latitude: 0, longitude: 0 })).toBe(false);
  });
});

describe('distance with unusable input', () => {
  it('returns Infinity rather than NaN', () => {
    const bad = { latitude: NaN, longitude: NaN };
    expect(haversineKm(bad, BENGALURU)).toBe(Infinity);
    expect(roadDistanceKm(bad, BENGALURU)).toBe(Infinity);

    // The point of Infinity over NaN: comparisons still behave sensibly, so a
    // record sorts last instead of silently vanishing from every filter.
    expect(roadDistanceKm(bad, BENGALURU) > 5).toBe(true);
    expect(Number.isNaN(roadDistanceKm(bad, BENGALURU))).toBe(false);
  });

  it('does not invent a distance for a 0,0 placeholder', () => {
    expect(roadDistanceKm({ latitude: 0, longitude: 0 }, BENGALURU)).toBe(Infinity);
  });

  it('still measures real distances correctly', () => {
    const km = haversineKm(BENGALURU, INDIRANAGAR);
    expect(km).toBeGreaterThan(4);
    expect(km).toBeLessThan(7);
  });
});

describe('presentation of unknown distances', () => {
  it('formats an unknown distance in words, not as NaN', () => {
    expect(formatDistance(Infinity)).toBe('Distance unavailable');
    expect(formatDistance(NaN)).toBe('Distance unavailable');
    expect(formatDistance(0.4)).toBe('400 m');
    expect(formatDistance(3.25)).toBe('3.3 km');
  });

  it('does not produce a bogus ETA for an unknown distance', () => {
    expect(estimateMinutes(Infinity)).toBe(0);
    expect(estimateMinutes(5)).toBeGreaterThan(5);
  });
});

describe('boundsOf', () => {
  it('ignores unusable points instead of collapsing the viewport', () => {
    const bounds = boundsOf([
      BENGALURU,
      INDIRANAGAR,
      { latitude: NaN, longitude: NaN },
      { latitude: 0, longitude: 0 },
    ]);
    expect(Number.isFinite(bounds.minLat)).toBe(true);
    expect(bounds.minLat).toBeGreaterThan(12);
    expect(bounds.maxLat).toBeLessThan(14);
  });

  it('falls back to a default box when nothing is usable', () => {
    expect(boundsOf([{ latitude: NaN, longitude: 0 }])).toEqual({
      minLat: 0,
      maxLat: 1,
      minLng: 0,
      maxLng: 1,
    });
  });
});
