/**
 * Payment Service
 * 
 * Handles Stripe PaymentIntent creation and escrow simulation.
 * 
 * ESCROW SIMULATION:
 * 1. INITIATED: PaymentIntent created, waiting for buyer to complete
 * 2. HELD: Payment successful, money "held" until delivery confirmed
 * 3. RELEASED: Order completed, payment "released" to seller
 * 4. REFUNDED: Order cancelled/rejected, payment refunded
 * 
 * IMPORTANT:
 * In production, use Stripe Connect with separate accounts for:
 * - Platform (marketplace)
 * - Sellers (vendors)
 * This allows actual fund holding and transfers.
 * 
 * For academic projects, we simulate with status tracking.
 */

import Stripe from "stripe";
import { env } from "../config/env";
import Order from "../models/Order";
import Payment, { PaymentStatus } from "../models/Payment";
import { AppError } from "../utils/AppError";

// Initialize Stripe
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia" as any // Use stable version
});

export class PaymentService {
  /**
   * Initiate Payment
   * Creates Stripe PaymentIntent and Payment record
   */
  async initiatePayment(orderId: string, buyerId: string) {
    // 1. Verify order exists and buyer owns it
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    
    if (order.buyerId.toString() !== buyerId) {
      throw new AppError("You are not authorized to pay for this order", 403);
    }
    
    if (order.status !== "PENDING") {
      throw new AppError(
        "Payment can only be initiated for PENDING orders",
        400
      );
    }
    
    // 2. Check if payment already exists
    const existingPayment = await Payment.findOne({ orderId: order._id });
    
    if (existingPayment && existingPayment.status !== PaymentStatus.FAILED) {
      throw new AppError("Payment already initiated for this order", 400);
    }
    
    // 3. Create Stripe PaymentIntent
    const amount = Math.round(order.totalAmount * 100); // Convert to cents
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: env.CURRENCY.toLowerCase(),
      metadata: {
        orderId: order._id.toString(),
        buyerId: order.buyerId.toString(),
        sellerId: order.sellerId.toString()
      },
      description: `Order #${order._id.toString().slice(-8)} - ${order.titleSnapshot}`,
      automatic_payment_methods: {
        enabled: true
      }
    });
    
    // 4. Create Payment record
    const payment = await Payment.create({
      orderId: order._id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      provider: "STRIPE",
      providerPaymentId: paymentIntent.id,
      amount: order.totalAmount,
      currency: env.CURRENCY,
      status: PaymentStatus.INITIATED,
      metadata: {
        stripePaymentIntentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret
      }
    });
    
    // 5. Attach payment to order
    order.paymentId = payment._id;
    await order.save();
    
    return {
      paymentId: payment._id,
      clientSecret: paymentIntent.client_secret,
      amount: order.totalAmount,
      currency: env.CURRENCY,
      status: PaymentStatus.INITIATED
    };
  }
  
  /**
   * Handle Stripe Webhook Events
   * Updates payment status based on Stripe events
   */
  async handleWebhook(payload: Buffer, signature: string) {
    let event: Stripe.Event;
    
    try {
      console.log("🔍 Verifying webhook signature...");
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
      console.log("✅ Signature verified successfully");
      console.log("📌 Event type:", event.type);
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
    }
    
    // Handle specific events
    switch (event.type) {
      case "payment_intent.succeeded":
        console.log("💰 Processing payment_intent.succeeded");
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case "payment_intent.payment_failed":
        console.log("❌ Processing payment_intent.payment_failed");
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      case "payment_intent.canceled":
        console.log("🚫 Processing payment_intent.canceled");
        await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        break;
      
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }
    
    return { received: true };
  }
  
  /**
   * Handle Successful Payment
   * Updates payment status to HELD (escrow)
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    console.log("🔍 Looking for payment with PaymentIntent ID:", paymentIntent.id);
    
    const payment = await Payment.findOne({
      providerPaymentId: paymentIntent.id
    });
    
    if (!payment) {
      console.error(`❌ Payment not found for PaymentIntent: ${paymentIntent.id}`);
      return;
    }
    
    console.log("✅ Found payment:", payment._id);
    console.log("📝 Current status:", payment.status);
    
    // Update payment status to HELD (in escrow)
    payment.status = PaymentStatus.HELD;
    await payment.save();
    
    console.log(`✅ Payment ${payment._id} marked as HELD (escrow)`);
  }
  
  /**
   * Handle Failed Payment
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await Payment.findOne({
      providerPaymentId: paymentIntent.id
    });
    
    if (!payment) {
      console.error(`Payment not found for PaymentIntent: ${paymentIntent.id}`);
      return;
    }
    
    payment.status = PaymentStatus.FAILED;
    await payment.save();
    
    console.log(`Payment ${payment._id} marked as FAILED`);
  }
  
  /**
   * Handle Canceled Payment
   */
  private async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
    const payment = await Payment.findOne({
      providerPaymentId: paymentIntent.id
    });
    
    if (!payment) {
      return;
    }
    
    payment.status = PaymentStatus.REFUNDED;
    await payment.save();
  }
  
  /**
   * Release Payment to Seller
   * Called when order is completed
   */
  async releasePayment(orderId: string) {
    const payment = await Payment.findOne({ orderId });
    
    if (!payment) {
      throw new AppError("Payment not found for this order", 404);
    }
    
    if (payment.status !== PaymentStatus.HELD) {
      throw new AppError(
        `Cannot release payment with status: ${payment.status}`,
        400
      );
    }
    
    // In production with Stripe Connect:
    // - Create transfer to seller's connected account
    // - Deduct platform fee
    
    // For simulation, just update status
    payment.status = PaymentStatus.RELEASED;
    await payment.save();
    
    console.log(`Payment ${payment._id} RELEASED to seller ${payment.sellerId}`);
    
    return payment;
  }
  
  /**
   * Refund Payment to Buyer
   * Called when order is cancelled or rejected
   */
  async refundPayment(orderId: string) {
    const payment = await Payment.findOne({ orderId });
    
    if (!payment) {
      throw new AppError("Payment not found for this order", 404);
    }
    
    if (![PaymentStatus.INITIATED, PaymentStatus.HELD].includes(payment.status)) {
      throw new AppError(
        `Cannot refund payment with status: ${payment.status}`,
        400
      );
    }
    
    // In production:
    // await stripe.refunds.create({ payment_intent: payment.providerPaymentId });
    
    // For simulation, just update status
    payment.status = PaymentStatus.REFUNDED;
    await payment.save();
    
    console.log(`Payment ${payment._id} REFUNDED to buyer ${payment.buyerId}`);
    
    return payment;
  }
  
  /**
   * Get Payment by Order ID
   */
  async getPaymentByOrderId(orderId: string, userId: string, role: string) {
    const payment = await Payment.findOne({ orderId })
      .populate("orderId", "status titleSnapshot")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email");
    
    if (!payment) {
      throw new AppError("Payment not found", 404);
    }
    
    // Authorization: only buyer, seller, or admin
    const isBuyer = payment.buyerId._id.toString() === userId;
    const isSeller = payment.sellerId._id.toString() === userId;
    const isAdmin = role === "admin";
    
    if (!isBuyer && !isSeller && !isAdmin) {
      throw new AppError("You are not authorized to view this payment", 403);
    }
    
    return payment;
  }
  
  /**
   * Get Payment by Payment ID
   */
  async getPaymentById(paymentId: string, userId: string, role: string) {
    const payment = await Payment.findById(paymentId)
      .populate("orderId", "status titleSnapshot")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email");
    
    if (!payment) {
      throw new AppError("Payment not found", 404);
    }
    
    // Authorization
    const isBuyer = payment.buyerId._id.toString() === userId;
    const isSeller = payment.sellerId._id.toString() === userId;
    const isAdmin = role === "admin";
    
    if (!isBuyer && !isSeller && !isAdmin) {
      throw new AppError("You are not authorized to view this payment", 403);
    }
    
    return payment;
  }
}
