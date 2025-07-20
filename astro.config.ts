import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://your-username.github.io',
  base: '/Fractal-js',
  outDir: './dist',
  publicDir: './public',

  integrations: [react(), tailwind(), sitemap()],

  vite: {
    plugins: [],
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'fractal-core': ['./src/lib/fractals'],
            'webgpu-utils': ['./src/lib/webgpu'],
          },
        },
      },
    },
    worker: {
      format: 'es',
    },
  },

  build: {
    inlineStylesheets: 'auto',
  },

  output: 'static',
});
