import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // manifest đã có sẵn trong public/manifest.webmanifest
      manifest: false,
      workbox: {
        // Lưu sẵn toàn bộ ứng dụng (gồm engine trong Web Worker) để chơi offline
        globPatterns: ['**/*.{js,css,html,svg,png,webp,webmanifest}'],
        // Ảnh bàn cờ lớn (~250KB/bàn): không tải sẵn hết, chỉ lưu khi người chơi mở bàn đó (runtimeCaching bên dưới)
        globIgnores: ['boards/**'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/boards/') || url.pathname.startsWith('/video/'),
            handler: 'CacheFirst',
            options: { cacheName: 'board-images', expiration: { maxEntries: 30 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  // Chạy local: web chuyển tiếp /api (kể cả WebSocket) sang wrangler ở cổng 8787.
  // Nhờ vậy điện thoại trong cùng Wi-Fi chỉ cần truy cập http://<IP máy>:5173 (tường lửa không cần mở cổng 8787).
  server: { port: 5173, host: true, proxy: { '/api': { target: 'http://127.0.0.1:8787', ws: true } } },
  preview: { port: 4173, host: true, proxy: { '/api': { target: 'http://127.0.0.1:8787', ws: true } } },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          engine: ['@np/rules', '@np/ai', '@np/patterns'],
        },
      },
    },
  },
});
