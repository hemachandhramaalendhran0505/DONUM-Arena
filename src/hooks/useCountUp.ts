import { useEffect, useRef, useState } from 'react';

interface Options {
  duration?: number;
  enabled?: boolean;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Animate a number from its previous value to `target`. Respects reduced motion. */
export function useCountUp(target: number, { duration = 900, enabled = true }: Options = {}): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const fromRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (!enabled || prefersReduced || !Number.isFinite(target)) {
      setValue(target);
      return;
    }

    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(from + (target - from) * easeOut(progress));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      fromRef.current = target;
    };
  }, [target, duration, enabled]);

  return value;
}
