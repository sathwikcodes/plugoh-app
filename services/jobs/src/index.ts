const POLL_MS = 10_000;

function tick() {
  console.log("[jobs] worker heartbeat", new Date().toISOString());
}

tick();
setInterval(tick, POLL_MS);
