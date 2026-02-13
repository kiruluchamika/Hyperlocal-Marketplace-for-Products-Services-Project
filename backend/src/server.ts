import "dotenv/config";
import app from "./app";
import { connectDb } from "./config/db";
import { env } from "./config/env";

const startServer = async () => {
  await connectDb();
  app.listen(Number(env.PORT), () => {
    console.log(`API running on port ${env.PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
