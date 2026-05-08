import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { readEnv } from "./config/env.js";

const config = readEnv();
const app = createApp({ config });

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`@plugoh/api listening on port ${config.port}`);
});
