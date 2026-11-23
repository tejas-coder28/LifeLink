import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function getBackendPort(mode) {
  // 1. Check process.env.BACKEND_PORT
  if (process.env.BACKEND_PORT) return process.env.BACKEND_PORT;

  // 2. Read from server/.env if it exists
  try {
    const serverEnvPath = path.resolve(__dirname, '../server/.env');
    if (fs.existsSync(serverEnvPath)) {
      const content = fs.readFileSync(serverEnvPath, 'utf8');
      const match = content.match(/^PORT\s*=\s*(\d+)/m);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    // Fall back to client env or default
  }

  // 3. Check client/.env VITE_API_BASE_URL port if specified
  try {
    const clientEnv = loadEnv(mode || 'development', process.cwd(), '');
    if (clientEnv.VITE_API_BASE_URL) {
      const urlMatch = clientEnv.VITE_API_BASE_URL.match(/:(\d+)/);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
      }
    }
  } catch (e) {
    // Fall back to default
  }

  return '5000';
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const backendPort = getBackendPort(mode);
  const backendTarget = `http://127.0.0.1:${backendPort}`;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5180,
      host: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.warn(
                `[vite proxy] ${req.method} ${req.url} -> Backend connection failed (${err.code || err.message}) at ${backendTarget}`
              );
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
    preview: {
      port: 5180,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
  };
});
