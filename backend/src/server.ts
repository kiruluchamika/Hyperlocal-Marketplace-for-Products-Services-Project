import "dotenv/config";
import { createServer } from "http";
import app from "./app";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import { initModerationCron } from "./services/moderation.cron";
import { setupNotificationSocket } from "./modules/notifications/socket/notificationSocket";
import { startNotificationWatcher } from "./modules/notifications/watchers/changeStreamWatcher";

const startServer = async () => {
  await connectDb();
  
  // Start background jobs
  initModerationCron();

  const port = Number(env.PORT);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${env.PORT}`);
  }

  const httpServer = createServer(app);

  const server = httpServer.listen(port, () => {
    console.log(`API running on port ${port}`);
    console.log(`Swagger UI available at:`);
    console.log(`  - http://localhost:${port}/api-docs`);
    console.log(`  - http://localhost:${port}/swagger`);
    console.log(`  - http://localhost:${port}/docs`);
    console.log(`Swagger JSON: http://localhost:${port}/swagger.json`);

    // Initialize notifications in a fail-safe way so core API flow is unchanged.
    try {
      const io = setupNotificationSocket(server);
      startNotificationWatcher(io);
    } catch (notificationInitError) {
      console.warn("Notification system initialization skipped:", notificationInitError);
    }
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Stop the running process or set a different PORT.`);
      process.exit(1);
    }

    console.error("Server failed to start", error);
    process.exit(1);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
