import mongoose from "mongoose";
import { env } from "./env";

const sanitizeMongoUri = (uri: string) => uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");

const isServerSelectionError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "MongooseServerSelectionError"
  );
};

const buildUrisToTry = (): string[] => {
  const uris = [env.MONGODB_URI];

  if (env.MONGODB_FALLBACK_URI && env.MONGODB_FALLBACK_URI !== env.MONGODB_URI) {
    uris.push(env.MONGODB_FALLBACK_URI);
  }

  return uris;
};

export const connectDb = async () => {
  const uris = buildUrisToTry();
  let lastError: unknown;

  for (let index = 0; index < uris.length; index += 1) {
    const uri = uris[index];
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
        family: Number(env.MONGODB_IP_FAMILY) as 4 | 6
      });
      console.log(`MongoDB connected (${index === 0 ? "primary" : "fallback"} URI)`);
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `MongoDB connection attempt ${index + 1}/${uris.length} failed for ${sanitizeMongoUri(uri)}`
      );
    }
  }

  if (isServerSelectionError(lastError)) {
    console.error("MongoDB Atlas connectivity issue detected.");
    console.error("- Ensure current IP is allowed in Atlas Network Access.");
    console.error("- Verify Atlas user credentials in MONGODB_URI.");
    console.error("- Confirm internet/VPN/firewall allows outbound 27017 and DNS SRV resolution.");
    console.error("- Optionally set MONGODB_FALLBACK_URI for local development.");
  }

  throw lastError;
};
