"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDb = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const sanitizeMongoUri = (uri) => uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
const isServerSelectionError = (error) => {
    return (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "MongooseServerSelectionError");
};
const buildUrisToTry = () => {
    const uris = [env_1.env.MONGODB_URI];
    if (env_1.env.MONGODB_FALLBACK_URI && env_1.env.MONGODB_FALLBACK_URI !== env_1.env.MONGODB_URI) {
        uris.push(env_1.env.MONGODB_FALLBACK_URI);
    }
    return uris;
};
const connectDb = async () => {
    const uris = buildUrisToTry();
    let lastError;
    for (let index = 0; index < uris.length; index += 1) {
        const uri = uris[index];
        try {
            await mongoose_1.default.connect(uri, {
                serverSelectionTimeoutMS: env_1.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS
            });
            console.log(`MongoDB connected (${index === 0 ? "primary" : "fallback"} URI)`);
            return;
        }
        catch (error) {
            lastError = error;
            console.error(`MongoDB connection attempt ${index + 1}/${uris.length} failed for ${sanitizeMongoUri(uri)}`);
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
exports.connectDb = connectDb;
