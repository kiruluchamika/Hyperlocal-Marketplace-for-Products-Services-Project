import "dotenv/config";
import app from "./app";
import { connectDb } from "./config/db";
import { env } from "./config/env";

const startServer = async () => {
  await connectDb();
  const port = Number(env.PORT);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${env.PORT}`);
  }

  const server = app.listen(port, () => {
    console.log(`API running on port ${port}`);
    console.log(`Swagger UI available at:`);
    console.log(`  - http://localhost:${port}/api-docs`);
    console.log(`  - http://localhost:${port}/swagger`);
    console.log(`  - http://localhost:${port}/docs`);
    console.log(`Swagger JSON: http://localhost:${port}/swagger.json`);
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
