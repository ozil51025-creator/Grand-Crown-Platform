import app from "./app";
import { logger } from "./lib/logger";
import {
  ensureDataStoreReady,
  runGrandCrownEarningsSweep,
  startGrandCrownEarningsScheduler,
} from "./routes/grand-crown";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  try {
    await ensureDataStoreReady();
    await runGrandCrownEarningsSweep();
    startGrandCrownEarningsScheduler((err) => {
      logger.error({ err }, "Scheduled earnings sweep failed");
    });
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");
    });
  } catch (err) {
    logger.error({ err }, "Grand Crown persistent storage is not ready");
    process.exit(1);
  }
}

void start();
