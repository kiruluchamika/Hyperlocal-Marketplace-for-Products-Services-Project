import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import routes from "./routes";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(cors());
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
		"./src/routes/*.ts",
		"./src/controllers/*.ts",
		"./dist/routes/*.js",
		"./dist/controllers/*.js",
	],
});

app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
