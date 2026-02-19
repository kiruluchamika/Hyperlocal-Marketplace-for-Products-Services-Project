"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const routes_1 = __importDefault(require("./routes"));
const notFound_1 = require("./middlewares/notFound");
const errorHandler_1 = require("./middlewares/errorHandler");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
// IMPORTANT: Stripe webhook needs raw body for signature verification
// Must come BEFORE express.json() middleware
app.use("/api/payments/webhook/stripe", express_1.default.raw({ type: "application/json" }));
app.use(express_1.default.json());
const swaggerSpec = (0, swagger_jsdoc_1.default)({
    definition: {
        openapi: "3.0.0",
        info: {
            title: "LocalLink API",
            version: "0.1.0",
            description: "API documentation for LocalLink backend",
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        servers: [{ url: "/api" }],
    },
    apis: [
        "./src/routes/*.ts",
        "./src/controllers/*.ts",
        "./dist/routes/*.js",
        "./dist/controllers/*.js",
    ],
});
app.use("/swagger", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
app.use("/api", routes_1.default);
app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
exports.default = app;
