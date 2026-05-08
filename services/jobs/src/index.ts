import { runAutoRelease } from "@plugoh/api/jobs";

async function main() {
  try {
    const result = await runAutoRelease();
    console.log("[jobs] auto-release completed", result);
    process.exit(0);
  } catch (error) {
    console.error("[jobs] auto-release failed", error);
    process.exit(1);
  }
}

void main();
