import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), VitePWA({
    disable: mode === 'native',
    filename: 'sw.js',
    manifestFilename: 'manifest.webmanifest',
    injectRegister: false,
    registerType: 'autoUpdate',
    manifest: {
      id: './', start_url: './', scope: './', name: 'BrainDAW · NeuroScape Studio', short_name: 'BrainDAW',
      description: 'Mix brainwave tones, nature recordings, and generative synth pads.',
      display: 'standalone', background_color: '#070a10', theme_color: '#070a10',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      clientsClaim: true,
      globPatterns: ['**/*.{html,js,css,svg,png,webmanifest,json,opus,m4a,md}'],
      globIgnores: ['**/sw.js', '**/workbox-*.js'],
    },
  })],
  server: { port: 5173, strictPort: true },
}));
