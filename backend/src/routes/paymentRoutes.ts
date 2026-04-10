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
import { requirePaymentsEnabled } from "../middlewares/paymentsEnabled";
import {
  initiatePaymentSchema,
  confirmPaymentSchema,
  getPaymentByOrderSchema,
  getPaymentByIdSchema
} from "../validators/paymentSchemas";
import {
  initiatePayment,
  confirmPayment,
  getStripeConfig,
  stripeWebhook,
  getPaymentByOrder,
  getPaymentById,
  testCompletePayment
} from "../controllers/paymentController";

const router = Router();

router.get("/config", getStripeConfig);

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
  requireRole(["user"]),
  requirePaymentsEnabled,
  validate(initiatePaymentSchema),
  initiatePayment
);

router.post(
  "/confirm",
  auth,
  requireRole(["user"]),
  requirePaymentsEnabled,
  validate(confirmPaymentSchema),
  confirmPayment
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
 * /payments/test/complete/{id}:
 *   patch:
 *     tags: [Payments]
 *     summary: TEST ONLY - Mark own payment as HELD (Buyer)
 *     description: |
 *       Testing endpoint for buyer flow checks.
 *       Allows the authenticated buyer to force their own payment into HELD status without Stripe webhook.
 *       Use only for local testing and remove/disable in production.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment document ID
 *     responses:
 *       200:
 *         description: Payment status updated to HELD
 *       400:
 *         description: Invalid payment ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only payment owner can update
 *       404:
 *         description: Payment not found
 */
router.patch(
  "/test/complete/:id",
  auth,
  requireRole(["user"]),
  validate(getPaymentByIdSchema, "params"),
  testCompletePayment
);

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
  requireRole(["user", "admin"]),
  validate(getPaymentByOrderSchema, "params"),
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
  requireRole(["user", "admin"]),
  validate(getPaymentByIdSchema, "params"),
  getPaymentById
);

export default router;
