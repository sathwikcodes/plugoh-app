import "./instrumentation.js";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { readEnv } from "./config/env.js";
import { logger } from "./core/logger.js";

const config = readEnv();
const app = createApp({ config });
let inFlightRequests = 0;
let isShuttingDown = false;

const trackedFetch: typeof app.fetch = async (request, env, executionContext) => {
  if (isShuttingDown) {
    return new Response("Server shutting down", { status: 503 });
  }
  inFlightRequests += 1;
  try {
    return await app.fetch(request, env, executionContext);
  } finally {
    inFlightRequests -= 1;
  }
};

const server = serve({ fetch: trackedFetch, port: config.port }, () => {
  logger.info({ port: config.port }, "@plugoh/api listening");
});

const shutdown = async (signal: NodeJS.Signals) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "Shutdown requested");
  server.close();

  const deadline = Date.now() + 25_000;
  while (inFlightRequests > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  logger.info({ inFlightRequests }, "Shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
