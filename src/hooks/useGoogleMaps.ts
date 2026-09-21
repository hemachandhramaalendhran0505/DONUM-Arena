import { useEffect, useState } from 'react';
import { googleMapsApiKey } from '@/firebase/config';

type LoadState = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';

let scriptPromise: Promise<void> | null = null;

/** Load the Google Maps JS API once, on demand. */
function loadScript(): Promise<void> {
  if (!googleMapsApiKey) return Promise.reject(new Error('unconfigured'));
  if (window.google?.maps) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Returns the Google Maps load state. When no API key is configured the value
 * is `unconfigured` and callers render DONUM's built-in schematic map instead —
 * so maps always work, with or without billing enabled.
 */
export function useGoogleMaps(): { state: LoadState; available: boolean } {
  const [state, setState] = useState<LoadState>(() => {
    if (!googleMapsApiKey) return 'unconfigured';
    return window.google?.maps ? 'ready' : 'idle';
  });

  useEffect(() => {
    if (state !== 'idle') return;
    let cancelled = false;
    setState('loading');
    loadScript()
      .then(() => !cancelled && setState('ready'))
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [state]);

  return { state, available: state === 'ready' };
}
