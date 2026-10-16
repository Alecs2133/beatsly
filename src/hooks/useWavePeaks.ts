import { useEffect, useState, type RefObject } from 'react';
import { extractRealPeaks } from '../utils/audioAnalyzer';

// Decodarea audio e scumpă: maximum 2 în paralel, restul așteaptă la coadă.
const MAX_PARALLEL = 2;
let running = 0;
const waiting: (() => void)[] = [];

function schedule<T>(job: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      running++;
      job()
        .then(resolve, reject)
        .finally(() => {
          running--;
          waiting.shift()?.();
        });
    };
    if (running < MAX_PARALLEL) start();
    else waiting.push(start);
  });
}

/**
 * Vârfurile formei de undă pentru un sunet, calculate abia când elementul
 * `ref` intră în ecran (și păstrate în cache de extractRealPeaks). Până
 * atunci întoarce `null`, iar cardul arată un schelet.
 */
export function useWavePeaks(url: string | undefined, ref: RefObject<Element>, bars = 40): number[] | null {
  const [peaks, setPeaks] = useState<number[] | null>(null);

  useEffect(() => {
    // Alt sunet → vârfurile vechi nu mai sunt valabile (playerul refolosește componenta).
    setPeaks(null);
    const el = ref.current;
    if (!url || !el) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        schedule(() => extractRealPeaks(url, bars))
          .then(p => { if (!cancelled) setPeaks(p); })
          .catch(() => {});
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [url, ref, bars]);

  return peaks;
}
