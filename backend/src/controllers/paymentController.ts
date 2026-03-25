/**
 * Payment Controller
 * 
 * Handles HTTP requests for payment operations.
 * Routes → Controller → Service → Database
 */

import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { PaymentService } from "../services/paymentService";

const paymentService = new PaymentService();

/**
 * POST /payments/initiate
 * Initiate payment for an order
 */
export const initiatePayment = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { orderId } = req.body;
    const buyerId = req.user!.id;
    
    const result = await paymentService.initiatePayment(orderId, buyerId);
    
    res.status(200).json({
      success: true,
      message: "Payment initiated successfully",
      data: result
    });
  }
);

/**
 * POST /payments/webhook/stripe
 * Handle Stripe webhook events
 * 
 * Note: Uses raw body (express.raw()) for signature verification
 */
export const stripeWebhook = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const signature = req.headers["stripe-signature"] as string;
    
    console.log("🔔 WEBHOOK RECEIVED");
    console.log("Headers:", req.headers);
    console.log("Signature:", signature);
    
    if (!signature) {
      console.error("❌ Missing stripe-signature header");
      res.status(400).json({
        success: false,
        message: "Missing stripe-signature header"
      });
      return;
    }
    
    // req.body is Buffer when using express.raw()
    const payload = req.body;
    
    console.log("📦 Payload received, size:", payload?.length || "unknown");
    
    try {
      await paymentService.handleWebhook(payload, signature);
      console.log("✅ Webhook processed successfully");
    } catch (error: any) {
      console.error("❌ Webhook error:", error.message);
      throw error;
    }
    
    // Stripe expects 200 response
    res.status(200).json({ received: true });
  }
);

/**
 * GET /payments/order/:orderId
 * Get payment by order ID
 */
export const getPaymentByOrder = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { orderId } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;
    
    const payment = await paymentService.getPaymentByOrderId(orderId, userId, role);
    
    res.status(200).json({
      success: true,
      data: payment
    });
  }
);

/**
 * TEST ONLY: Manually complete payment (for testing)
 * Remove this after testing
 */
export const testCompletePayment = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const paymentId = req.params.paymentId || req.params.id;
    const userId = req.user!.id;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required"
      });
    }
    
    console.log("🧪 TEST ENDPOINT: Updating payment status to HELD");
    console.log("Payment ID:", paymentId);
    
    const Payment = require("../models/Payment").default;
    const { PaymentStatus } = require("../models/Payment");

    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    if (payment.buyerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this payment"
      });
    }

    payment.status = PaymentStatus.HELD;
    await payment.save();
    
    res.status(200).json({
      success: true,
      message: "Payment status updated to HELD (TEST ONLY)",
      data: payment
    });
  }
);

/**
 * GET /payments/:id
 * Get payment by payment ID
 */
export const getPaymentById = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;
    
    const payment = await paymentService.getPaymentById(id, userId, role);
    
    res.status(200).json({
      success: true,
      data: payment
    });
  }
);
