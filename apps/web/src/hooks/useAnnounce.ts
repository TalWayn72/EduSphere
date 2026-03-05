import { useEffect, useRef, useCallback } from 'react';

type Politeness = 'polite' | 'assertive';

function getOrCreateRegion(politeness: Politeness): HTMLElement {
  const id = `aria-live-${politeness}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', politeness);
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    document.body.appendChild(el);
  }
  return el;
}

export function useAnnounce() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback((message: string, politeness: Politeness = 'polite') => {
    const region = getOrCreateRegion(politeness);
    region.textContent = '';
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      region.textContent = message;
    }, 50);
  }, []);
}
