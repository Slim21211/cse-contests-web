import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  // basicSsl: dev-сервер на https://localhost:5173 — VK ID принимает только https redirect.
  plugins: [react(), basicSsl()],
  base: '/',
  server: { host: true, port: 443, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
