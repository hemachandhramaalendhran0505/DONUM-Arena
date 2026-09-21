import type { GeoPoint } from '@/types';

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * True when a coordinate is usable: finite and inside the valid lat/lng range.
 *
 * `0,0` is treated as invalid on purpose — it is the classic "missing
 * coordinate" sentinel (a point in the Atlantic), and letting it through
 * produces confident, wildly wrong distances like "8,663 km away".
 */
export function isValidCoordinate(p: Partial<GeoPoint> | null | undefined): p is GeoPoint {
  if (!p) return false;
  const { latitude: lat, longitude: lng } = p;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return !(lat === 0 && lng === 0);
}

/**
 * Great-circle distance between two coordinates, in kilometres.
 *
 * Returns Infinity for unusable input rather than NaN. NaN is the dangerous
 * value here: every comparison against it is false, so a donation with a bad
 * coordinate silently disappears from distance filters instead of sorting last.
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  if (!isValidCoordinate(a) || !isValidCoordinate(b)) return Infinity;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rough road distance — straight line distance inflated by a city detour factor. */
export function roadDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const straight = haversineKm(a, b);
  if (!Number.isFinite(straight)) return Infinity;
  return Math.round(straight * 1.25 * 10) / 10;
}

/** Travel time estimate (minutes) for a two-wheeler in dense city traffic. */
export function estimateMinutes(distanceKm: number, avgSpeedKmh = 22): number {
  if (!Number.isFinite(distanceKm)) return 0;
  return Math.max(6, Math.round((distanceKm / avgSpeedKmh) * 60) + 5);
}

export function formatDistance(km: number): string {
  // Unknown distance must read as unknown, not as "NaN km" or "0 m".
  if (!Number.isFinite(km)) return 'Distance unavailable';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Deterministic pseudo-random jitter so seeded demo coordinates stay stable. */
export function jitter(seed: number, amount = 0.02): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return (x - Math.floor(x) - 0.5) * 2 * amount;
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export function boundsOf(points: GeoPoint[], padding = 0.01): Bounds {
  if (points.length === 0) {
    return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
  }
  const usable = points.filter(isValidCoordinate);
  if (usable.length === 0) return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
  const lats = usable.map((p) => p.latitude);
  const lngs = usable.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPad = Math.max((maxLat - minLat) * 0.25, padding);
  const lngPad = Math.max((maxLng - minLng) * 0.25, padding);
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

/** Project a coordinate into 0..100 percentage space for the schematic map. */
export function projectToPercent(point: GeoPoint, bounds: Bounds): { x: number; y: number } {
  const width = bounds.maxLng - bounds.minLng || 1;
  const height = bounds.maxLat - bounds.minLat || 1;
  return {
    x: ((point.longitude - bounds.minLng) / width) * 100,
    y: (1 - (point.latitude - bounds.minLat) / height) * 100,
  };
}
