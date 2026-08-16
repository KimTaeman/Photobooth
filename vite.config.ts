import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        // lottie-react imports the full player internally. The light player
        // removes expression evaluation and is sufficient for our SVG stickers.
        find: /^lottie-web$/,
        replacement: 'lottie-web/build/player/lottie_light.js',
      },
    ],
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              priority: 60,
            },
            {
              name: 'router-vendor',
              test: /node_modules[\\/](?:react-router|react-router-dom)[\\/]/,
              priority: 50,
            },
            {
              name: 'supabase-vendor',
              test: /node_modules[\\/]@supabase[\\/]/,
              priority: 40,
            },
            {
              name: 'tauri-vendor',
              test: /node_modules[\\/]@tauri-apps[\\/]/,
              priority: 40,
            },
            {
              name: 'lottie-vendor',
              test: /node_modules[\\/](?:lottie-react|lottie-web)[\\/]/,
              priority: 40,
            },
            {
              name: 'icons-vendor',
              test: /node_modules[\\/]lucide-react[\\/]/,
              priority: 30,
            },
            {
              name: 'qrcode-vendor',
              test: /node_modules[\\/]qrcode[\\/]/,
              priority: 30,
            },
            {
              // Keep the dynamically imported encoder isolated so it is only
              // downloaded when the result screen generates a GIF.
              name: 'gifshot',
              test: /node_modules[\\/]gifshot[\\/]/,
              priority: 30,
            },
          ],
        },
      },
    },
  },
});
