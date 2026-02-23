import express from "express";
import cors from "cors";
import path from "path";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import routes from "./routes";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(cors());

// IMPORTANT: Stripe webhook needs raw body for signature verification
// Must come BEFORE express.json() middleware
app.use(
  "/api/payments/webhook/stripe",
  express.raw({ type: "application/json" })
);

app.use(express.json());

const swaggerSpec = swaggerJsdoc({
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
		path.join(process.cwd(), "src/routes/**/*.ts"),
		path.join(process.cwd(), "dist/routes/**/*.js"),
		path.join(__dirname, "routes/**/*.js"),
	],
});

app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/swagger.json", (_req, res) => res.json(swaggerSpec));
app.get("/api/swagger.json", (_req, res) => res.json(swaggerSpec));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
