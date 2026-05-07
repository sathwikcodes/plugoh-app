import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({
    service: "api",
    status: "ok",
  });
});

app.get("/", (c) => {
  return c.json({
    name: "plugoh-marketplace-api",
    version: "v1",
  });
});

const port = Number(process.env.PORT ?? 4000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`@plugoh/api listening on port ${port}`);
});
