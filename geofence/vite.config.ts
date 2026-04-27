import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/DAS_TMS_prototype/geofence/' : '/',
  plugins: [react()],
  server: {
    port: 5373,
    strictPort: false,
    open: true,
    allowedHosts: ['.trycloudflare.com'],
  },
}));
