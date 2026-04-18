import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const versionJsonPlugin = {
  name: 'version-json',
  generateBundle() {
    const buildTime = Date.now();
    const d = new Date(buildTime);
    const pad = (n: number) => String(n).padStart(2, '0');
    const defaultVersion = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const version = process.env.APP_VERSION ?? defaultVersion;
    (this as any).emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildTime, version }),
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
