import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.warn(`[vite proxy] ${req.method} ${req.url} -> Backend connection failed (${err.code || err.message}) at http://127.0.0.1:5000`);
            if (res && !res.headersSent && res.writeHead) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: false,
                  message: "Can't reach the LifeLink server. Please check that the backend is running and try again.",
                })
              );
            }
          });
        },
      },
    },
  },
});
