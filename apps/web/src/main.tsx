import React from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from 'lenis';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { ReducedMotionProvider } from './providers/ReducedMotionProvider';
import '@/styles/globals.css';
import { registerServiceWorker } from './pwa';
import { reportWebVitals } from './lib/vitals';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <React.StrictMode>
      <ReducedMotionProvider>
        <App />
      </ReducedMotionProvider>
    </React.StrictMode>
  </HelmetProvider>
);

registerServiceWorker();
reportWebVitals();

// Initialize Lenis smooth scroll after mount
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});

function raf(time: number) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);
