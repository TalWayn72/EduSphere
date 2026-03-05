import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!focusable.length) return;

    const first: HTMLElement | undefined = focusable[0];
    const last: HTMLElement | undefined = focusable[focusable.length - 1];
    if (!first || !last) return;
    const firstEl: HTMLElement = first;
    const lastEl: HTMLElement = last;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }

    el.addEventListener('keydown', handleKeyDown);
    firstEl.focus();
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return ref;
}
