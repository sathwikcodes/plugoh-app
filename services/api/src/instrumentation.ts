import appInsights from "applicationinsights";
import { readEnv } from "./config/env.js";

const config = readEnv();

if (config.applicationInsightsConnectionString) {
  appInsights
    .setup(config.applicationInsightsConnectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .start();
}
