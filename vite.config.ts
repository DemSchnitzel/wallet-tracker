import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const versionJsonPlugin = {
  name: 'version-json',
  generateBundle() {
    (this as any).emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildTime: Date.now() }),
    });
  },
};

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), versionJsonPlugin],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
