import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/localhost:4000\/graphql/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'graphql-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      manifest: {
        name: 'EduSphere',
        short_name: 'EduSphere',
        description: 'AI-powered knowledge graph learning platform',
        theme_color: '#2563EB',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4006',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Raise warning threshold — KaTeX + ContentViewer are intentionally large
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // ── Manual chunk groups ──────────────────────────────────────────────
        // Splits the 523 kB entry bundle into cacheable vendor layers so that
        // app code changes don't invalidate stable library caches.
        manualChunks(id) {
          // KaTeX — large math renderer, only needed on RichDocument/Annotation pages
          if (id.includes('node_modules/katex')) return 'vendor-katex';
          // React core (react, react-dom, scheduler)
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          )
            return 'vendor-react';
          // React Router
          if (
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/@remix-run/')
          )
            return 'vendor-router';
          // Radix UI primitives + shadcn component wrappers (large, very stable)
          if (
            id.includes('node_modules/@radix-ui/') ||
            id.includes('node_modules/cmdk') ||
            id.includes('node_modules/vaul')
          )
            return 'vendor-radix';
          // Lucide icons — consolidate ~200 tiny per-icon chunks into one
          if (id.includes('node_modules/lucide-react')) return 'vendor-lucide';
          // i18n
          if (
            id.includes('node_modules/i18next') ||
            id.includes('node_modules/react-i18next')
          )
            return 'vendor-i18n';
          // GraphQL client (urql) + graphql-core
          if (
            id.includes('node_modules/urql') ||
            id.includes('node_modules/@urql/') ||
            id.includes('node_modules/graphql/')
          )
            return 'vendor-graphql';
          // TanStack (Query + Table + Virtual) — used on Admin + Analytics pages
          if (id.includes('node_modules/@tanstack/')) return 'vendor-tanstack';
          // Zod + react-hook-form — form validation across many pages
          if (
            id.includes('node_modules/zod') ||
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/@hookform/')
          )
            return 'vendor-forms';
          // Date utilities
          if (
            id.includes('node_modules/date-fns') ||
            id.includes('node_modules/dayjs')
          )
            return 'vendor-dates';
          // Tiptap rich-text editor + ProseMirror + lowlight syntax highlight
          // (only loaded on RichDocumentPage / DocumentAnnotationPage)
          if (
            id.includes('node_modules/@tiptap/') ||
            id.includes('node_modules/prosemirror-') ||
            id.includes('node_modules/lowlight') ||
            id.includes('node_modules/highlight.js') ||
            id.includes('node_modules/fault/')
          )
            return 'vendor-tiptap';
          // Real-time collaboration (Yjs CRDT + Hocuspocus)
          if (
            id.includes('node_modules/yjs') ||
            id.includes('node_modules/y-') ||
            id.includes('node_modules/@hocuspocus/') ||
            id.includes('node_modules/lib0/')
          )
            return 'vendor-collab';
          // Charts (recharts + d3-*)
          if (
            id.includes('node_modules/recharts') ||
            id.includes('node_modules/d3-') ||
            id.includes('node_modules/victory-')
          )
            return 'vendor-charts';
          // HLS.js video streaming (only on ContentViewer/VideoPlayer pages)
          if (id.includes('node_modules/hls.js')) return 'vendor-hls';
          // Keycloak auth client
          if (id.includes('node_modules/keycloak-js')) return 'vendor-keycloak';
          // DnD kit (drag-and-drop, admin course builder)
          if (id.includes('node_modules/@dnd-kit/')) return 'vendor-dnd';
          // Remaining node_modules — shared utility chunk
          if (id.includes('node_modules/')) return 'vendor-misc';
        },
      },
    },
  },
});
