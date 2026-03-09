// @gsap/react stub for vitest/jsdom — useGSAP calls useLayoutEffect which
// is fine in jsdom but the GSAP animation calls would crash without stubs.
// This stub turns useGSAP into a plain call to the user's callback (no cleanup context).

import { useEffect } from 'react';

export function useGSAP(
  callback: () => void,
  _dependencies?: unknown,
): void {
  // Run the callback in useEffect so it is called during the React lifecycle
  // in tests. GSAP calls inside the callback are no-ops (gsap-stub.ts).
  useEffect(() => {
    try {
      callback();
    } catch {
      // Silently ignore — jsdom may lack some GSAP-required browser APIs
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default useGSAP;
