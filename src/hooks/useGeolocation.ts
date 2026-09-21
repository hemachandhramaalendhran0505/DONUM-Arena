import { useCallback, useState } from 'react';
import type { GeoPoint } from '@/types';

interface GeolocationState {
  position: GeoPoint | null;
  loading: boolean;
  error: string | null;
  denied: boolean;
}

/** Bengaluru city centre — used when the browser cannot provide a position. */
export const FALLBACK_POSITION: GeoPoint = { latitude: 12.9716, longitude: 77.5946 };

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    loading: false,
    error: null,
    denied: false,
  });

  const request = useCallback((): Promise<GeoPoint> => {
    if (!('geolocation' in navigator)) {
      setState({
        position: FALLBACK_POSITION,
        loading: false,
        error: 'Location is not supported on this device.',
        denied: true,
      });
      return Promise.resolve(FALLBACK_POSITION);
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setState({ position, loading: false, error: null, denied: false });
          resolve(position);
        },
        (err) => {
          setState({
            position: FALLBACK_POSITION,
            loading: false,
            error:
              err.code === err.PERMISSION_DENIED
                ? 'Location permission was declined. You can still enter an address manually.'
                : 'We could not read your location. Please enter an address manually.',
            denied: err.code === err.PERMISSION_DENIED,
          });
          resolve(FALLBACK_POSITION);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
      );
    });
  }, []);

  return { ...state, request };
}
