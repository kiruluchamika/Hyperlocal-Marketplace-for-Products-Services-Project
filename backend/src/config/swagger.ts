/**
 * Swagger Configuration
 * 
 * Configures swagger-jsdoc to scan all route files and generate OpenAPI documentation
 */

import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { env } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hyperlocal Marketplace API",
      version: "1.0.0",
      description: "REST API for Hyperlocal Marketplace - Products & Services platform with user-based selling and buying",
      contact: {
        name: "API Support",
        email: "support@hyperlocal-marketplace.com"
      }
    },
    servers: [
      {
        url: `http://localhost:${env.PORT || 5000}/api`,
        description: "Local development server"
      },
      {
        url: "http://localhost:5000/api",
        description: "Alternative local server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token obtained from login/register"
        }
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message"
            },
            statusCode: {
              type: "number",
              description: "HTTP status code"
            }
          }
        }
      }
    },
    tags: [
      {
        name: "Auth",
        description: "Authentication endpoints - register and login"
      },
      {
        name: "Users",
        description: "User management endpoints"
      },
      {
        name: "Categories",
        description: "Category management (admin only)"
      },
      {
        name: "Listings",
        description: "Product listing management - any user can create/sell"
      },
      {
        name: "Orders",
        description: "Order management - buying and selling"
      },
      {
        name: "Payments",
        description: "Payment processing and management"
      },
      {
        name: "OTP",
        description: "Phone OTP send and verification via Twilio Verify"
      }
    ]
  },
  // Scan all route files for @openapi annotations
  apis: [
    path.join(process.cwd(), "src/routes/**/*.ts"),
    path.join(process.cwd(), "src/routes/**/*.js")
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
