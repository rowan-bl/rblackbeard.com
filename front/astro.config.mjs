// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

import vercelStatic from '@astrojs/vercel/static';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: vercelStatic({
    webAnalytics: { enabled: false },
  }
  ),

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [react()],
});