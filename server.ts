/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Check if running under tsx (either via --import tsx or tsx executable)
const isTsxLoaded =
  Boolean(process.env.__TSX_BOOTSTRAPPED__) ||
  process.execArgv.some((arg) => arg.includes('tsx')) ||
  Boolean(process.argv[1]?.includes('tsx'));

if (!isTsxLoaded) {
  process.env.__TSX_BOOTSTRAPPED__ = 'true';
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: process.env,
    }
  );

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });

  child.on('error', (err) => {
    console.error('[Assessora Server] Failed to bootstrap with tsx:', err);
    process.exit(1);
  });
} else {
  await runMainServer();
}

async function runMainServer() {
  const http = (await import('node:http')).default;
  const express = (await import('express')).default;
  const path = (await import('node:path')).default;
  const { fileURLToPath: toFilePath } = await import('node:url');
  const { apiRouter } = await import('./src/server/routes');
  const { initDb } = await import('./src/server/db');

  const __filename = toFilePath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Initialize server database directory and stores
  await initDb();

  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  // JSON request body parser
  app.use(express.json({ limit: '10mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  // Health check endpoint for Cloud Run
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development mode: attach Vite as middleware with WebSocket handling on the HTTP server
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Assessora Server] Running on http://0.0.0.0:${PORT} (${
        isProduction ? 'production' : 'development'
      })`
    );
  });
}

