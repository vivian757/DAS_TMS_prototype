import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/DAS_TMS_prototype/renie-create-order/' : '/',
  plugins: [react()],
  server: {
    port: 5180,
    host: true,
  },
}));
