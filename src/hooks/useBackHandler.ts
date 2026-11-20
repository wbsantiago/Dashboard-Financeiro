import { useEffect, useRef } from 'react';
import { registerBackHandler } from '../utils/backNavigation';

export function useBackHandler(enabled: boolean, handler: () => boolean | void, priority = 100) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (enabled) return registerBackHandler(() => latest.current(), priority);
  }, [enabled, priority]);
}
