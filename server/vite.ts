import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server?: Server) {
  if (process.env.NODE_ENV === 'production') return;

  const vite = await createViteServer({
    ...viteConfig,
    server: {
      middlewareMode: true,
      hmr: server ? { server } : undefined,
    },
    appType: 'custom',
    logLevel: 'info'
  });

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const template = await vite.transformIndexHtml(
        url,
        await fs.promises.readFile(
          path.resolve(process.cwd(), 'client/index.html'),
          'utf-8'
        )
      );
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), 'dist/public');

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Build directory not found: ${distPath}. Run 'npm run build' first.`
    );
  }

  app.use(express.static(distPath));
  app.use('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));
}