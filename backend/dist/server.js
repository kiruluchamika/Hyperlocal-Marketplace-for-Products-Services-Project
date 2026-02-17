"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const startServer = async () => {
    await (0, db_1.connectDb)();
    app_1.default.listen(Number(env_1.env.PORT), () => {
        console.log(`API running on port ${env_1.env.PORT}`);
    });
};
startServer().catch((err) => {
    console.error("Failed to start server", err);
    process.exit(1);
});
