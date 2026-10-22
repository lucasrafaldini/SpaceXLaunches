import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin, type Connect } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * CelesTrak only refreshes GP data every 2 hours and answers repeated downloads
 * with 403 "GP data has not updated…". This middleware caches responses on disk,
 * serves them while fresh, and falls back to the last good copy when CelesTrak refuses.
 */
function celestrakCache(): Plugin {
  const CACHE_DIR = path.resolve(__dirname, 'node_modules/.cache/celestrak');
  const TTL_MS = 2 * 60 * 60 * 1000;
  const routes: Record<string, string> = {
    '/api/celestrak-sup': 'https://celestrak.org/NORAD/elements/supplemental/sup-gp.php',
    '/api/celestrak': 'https://celestrak.org/NORAD/elements/gp.php',
  };
  const inflight = new Map<string, Promise<{ status: number; body: string }>>();

  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    const url = req.url ?? '';
    const prefix = Object.keys(routes).find((r) => url === r || url.startsWith(r + '?'));
    if (!prefix) return next();

    const query = url.slice(prefix.length);
    const upstream = routes[prefix] + query;
    const file = path.join(CACHE_DIR, crypto.createHash('sha1').update(upstream).digest('hex') + '.txt');
    const send = (status: number, body: string, cache: string) => {
      res.statusCode = status;
      res.setHeader('Content-Type', query.includes('FORMAT=json') ? 'application/json' : 'text/plain; charset=utf-8');
      res.setHeader('X-Cache', cache);
      res.end(body);
    };

    const stat = fs.existsSync(file) ? fs.statSync(file) : null;
    if (stat && Date.now() - stat.mtimeMs < TTL_MS) return send(200, fs.readFileSync(file, 'utf8'), 'HIT');

    try {
      if (!inflight.has(upstream)) {
        inflight.set(
          upstream,
          fetch(upstream, { headers: { 'User-Agent': 'SpaceX-Orbital-3D/1.0' } })
            .then(async (r) => ({ status: r.status, body: await r.text() }))
            .finally(() => inflight.delete(upstream))
        );
      }
      const { status, body } = await inflight.get(upstream)!;
      // "No GP data found" (e.g. nothing named STARSHIP in orbit) is a valid, cacheable answer
      if ((status === 200 && (body.startsWith('OBJECT_NAME') || body.startsWith('['))) || body.includes('No GP data')) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(file, body);
        return send(200, body, 'MISS');
      }
      if (stat) return send(200, fs.readFileSync(file, 'utf8'), 'STALE');
      return send(status === 200 ? 404 : status, body, 'BYPASS');
    } catch (err) {
      if (stat) return send(200, fs.readFileSync(file, 'utf8'), 'STALE');
      send(502, String(err), 'ERROR');
    }
  };

  return {
    name: 'celestrak-cache',
    configureServer: (server) => void server.middlewares.use(handler),
    configurePreviewServer: (server) => void server.middlewares.use(handler),
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), celestrakCache()],
  resolve: {
    // The app is WebGL-only: keep three's WebGPU/TSL builds out of the bundle (see the stub for details)
    alias: [
      { find: /^three\/webgpu$/, replacement: path.resolve(__dirname, 'src/lib/webgpu-stub.ts') },
      { find: /^three\/tsl$/, replacement: path.resolve(__dirname, 'src/lib/webgpu-stub.ts') },
    ],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    // three.js and the globe.gl stack are needed up front and are large by nature; split them so
    // each caches independently across deploys
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-three', test: /[\\/]node_modules[\\/]three[\\/]/, priority: 30 },
            { name: 'vendor-react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler|zustand)[\\/]/, priority: 20 },
            { name: 'vendor-globe', test: /[\\/]node_modules[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
