import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import routes from "./routes";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";
import { swaggerSpec } from "./config/swagger";
import { authOptional } from "./middlewares/authOptional";
import { maintenanceModeGuard } from "./middlewares/maintenanceMode";

const app = express();

app.use(cors());

// IMPORTANT: Stripe webhook needs raw body for signature verification
// Must come BEFORE express.json() middleware
app.use(
  "/api/payments/webhook/stripe",
  express.raw({ type: "application/json" })
);

app.use(express.json({ limit: "8mb" }));
app.use(authOptional);
app.use(maintenanceModeGuard);

// Swagger UI - Multiple endpoints for convenience
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Hyperlocal Marketplace API Docs"
}));
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Swagger JSON endpoint
app.get("/swagger.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
