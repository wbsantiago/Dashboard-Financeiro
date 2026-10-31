import { useCallback, useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/** Animate the first populated chart, including data loaded after sign-in. */
export function useChartEntrance(hasData: boolean) {
  const reducedMotion = useReducedMotion();
  const [finished, setFinished] = useState(false);
  const finish = useCallback(() => setFinished(true), []);
  const isEntering = hasData && !reducedMotion && !finished;
  useEffect(() => {
    if (!isEntering) return;
    // Recharts also calls its end callback during cleanup; keep one entrance window.
    const timer = window.setTimeout(finish, 1300);
    return () => window.clearTimeout(timer);
  }, [isEntering, finish]);
  return { isEntering, finish };
}
