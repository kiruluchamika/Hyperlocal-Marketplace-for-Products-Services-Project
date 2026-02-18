/**
 * Payment Routes
 * 
 * Defines payment-related endpoints.
 * 
 * IMPORTANT: Webhook endpoint uses raw body parser (configured in app.ts)
 */

import { Router } from "express";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import { validate } from "../middlewares/validate";
import {
  initiatePaymentSchema,
  getPaymentByOrderSchema,
  getPaymentByIdSchema
} from "../validators/paymentSchemas";
import {
  initiatePayment,
  stripeWebhook,
  getPaymentByOrder,
  getPaymentById
} from "../controllers/paymentController";

const router = Router();

/**
 * @openapi
 * /payments/initiate:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate payment for an order (Buyer only)
 *     description: |
 *       Creates a Stripe PaymentIntent for the order and returns client secret for frontend payment processing.
 *       Order must be in PENDING status. Payment will be held in escrow (HELD) until order completion.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: MongoDB ObjectId of the order
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentId:
 *                   type: string
 *                   description: MongoDB Payment document ID
 *                 clientSecret:
 *                   type: string
 *                   description: Stripe PaymentIntent client secret for frontend
 *                 amount:
 *                   type: number
 *                   description: Payment amount in smallest currency unit
 *                 currency:
 *                   type: string
 *                   description: Currency code (e.g., LKR, USD)
 *       400:
 *         description: Invalid order status or payment already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires buyer role or not order owner
 *       404:
 *         description: Order not found
 */
router.post(
  "/initiate",
  auth,
  requireRole(["buyer"]),
  validate(initiatePaymentSchema),
  initiatePayment
);

/**
 * @openapi
 * /payments/webhook/stripe:
 *   post:
 *     tags: [Payments]
 *     summary: Stripe webhook endpoint (Public)
 *     description: |
 *       Receives Stripe webhook events for payment status updates.
 *       Handles payment_intent.succeeded, payment_intent.payment_failed, and payment_intent.canceled events.
 *       Endpoint is public but verified using Stripe signature in request header.
 *       
 *       **Note:** Raw body parser is configured in app.ts for signature verification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe webhook event payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid signature or webhook processing error
 */
router.post("/webhook/stripe", stripeWebhook);

/**
 * @openapi
 * /payments/order/{orderId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment by order ID
 *     description: Retrieve payment details for a specific order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Payment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 orderId:
 *                   type: string
 *                 buyerId:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 currency:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [INITIATED, HELD, RELEASED, REFUNDED, FAILED]
 *                 providerPaymentId:
 *                   type: string
 *                   description: Stripe PaymentIntent ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Payment not found
 */
router.get(
  "/order/:orderId",
  auth,
  requireRole(["buyer", "seller", "admin"]),
  validate(getPaymentByOrderSchema),
  getPaymentByOrder
);

/**
 * @openapi
 * /payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment by payment ID
 *     description: Retrieve payment details using payment document ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 orderId:
 *                   type: string
 *                 buyerId:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 currency:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [INITIATED, HELD, RELEASED, REFUNDED, FAILED]
 *                 providerPaymentId:
 *                   type: string
 *                   description: Stripe PaymentIntent ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Payment not found
 */
router.get(
  "/:id",
  auth,
  requireRole(["buyer", "seller", "admin"]),
  validate(getPaymentByIdSchema),
  getPaymentById
);

export default router;
