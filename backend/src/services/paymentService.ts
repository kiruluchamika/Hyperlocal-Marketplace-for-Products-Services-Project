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
import ServiceBooking from "../models/ServiceBooking";
import { AppError } from "../utils/AppError";
import { StripeConnectService } from "./stripeConnectService";

// ✅ ADD: booking confirm handler (ONLY used when paymentPurpose === BOOKING_DEPOSIT)
import { confirmBookingFromStripeSuccess } from "./serviceBookingService";

// Initialize Stripe
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia" as any // Use stable version
});

const stripeConnectService = new StripeConnectService();
const stripePaymentCurrency = env.STRIPE_PAYMENT_CURRENCY.toUpperCase();

const convertDisplayAmountToStripeAmount = (amount: number) => {
  if (stripePaymentCurrency === "USD") {
    return Math.round((amount / env.STRIPE_BALANCE_TO_LKR_RATE) * 100) / 100;
  }

  return amount;
};

const normalizePayoutAmount = (amount: number, sourceCurrency?: string) => {
  const normalizedSource = String(sourceCurrency || stripePaymentCurrency).toUpperCase();

  if (normalizedSource === stripePaymentCurrency) {
    return amount;
  }

  if (normalizedSource === "LKR" && stripePaymentCurrency === "USD") {
    return Math.round((amount / env.STRIPE_BALANCE_TO_LKR_RATE) * 100) / 100;
  }

  if (normalizedSource === "USD" && stripePaymentCurrency === "LKR") {
    return Math.round(amount * env.STRIPE_BALANCE_TO_LKR_RATE * 100) / 100;
  }

  return amount;
};

export class PaymentService {
  getPublishableKey() {
    return env.STRIPE_PUBLISHABLE_KEY;
  }

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
    const chargeableAmount = convertDisplayAmountToStripeAmount(Number(order.totalAmount || 0));
    const amount = Math.round(chargeableAmount * 100); // Convert to smallest currency unit

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: stripePaymentCurrency.toLowerCase(),
      metadata: {
        orderId: order._id.toString(),
        buyerId: order.buyerId.toString(),
        sellerId: order.sellerId.toString(),
        displayAmountLkr: String(order.totalAmount),
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
      amount: chargeableAmount,
      currency: stripePaymentCurrency,
      status: PaymentStatus.INITIATED,
      metadata: {
        stripePaymentIntentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret,
        displayAmountLkr: order.totalAmount,
      }
    });

    // 5. Attach payment to order
    order.paymentId = payment._id;
    await order.save();

    return {
      paymentId: payment._id,
      clientSecret: paymentIntent.client_secret,
      amount: chargeableAmount,
      currency: stripePaymentCurrency,
      status: PaymentStatus.INITIATED
    };
  }

  /**
   * Confirm payment from client-side checkout success.
   * Useful for environments where webhook delivery is delayed.
   */
  async confirmPayment(orderId: string, buyerId: string, paymentIntentId?: string) {
    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      throw new AppError("Payment not found for this order", 404);
    }

    if (payment.buyerId.toString() !== buyerId) {
      throw new AppError("You are not authorized to confirm this payment", 403);
    }

    if (paymentIntentId && payment.providerPaymentId !== paymentIntentId) {
      throw new AppError("PaymentIntent does not match this order payment", 400);
    }

    if (payment.status === PaymentStatus.HELD || payment.status === PaymentStatus.RELEASED) {
      return payment;
    }

    if (payment.status !== PaymentStatus.INITIATED) {
      throw new AppError(`Cannot confirm payment with status: ${payment.status}`, 400);
    }

    const intent = await stripe.paymentIntents.retrieve(payment.providerPaymentId);
    if (!intent) {
      throw new AppError("Stripe PaymentIntent not found", 404);
    }

    if (!["succeeded", "processing", "requires_capture"].includes(intent.status)) {
      throw new AppError("Payment has not completed successfully yet", 400);
    }

    payment.status = PaymentStatus.HELD;
    payment.metadata = payment.metadata || {};

    const latestCharge = intent.latest_charge;
    if (typeof latestCharge === "string") {
      payment.metadata.stripeChargeId = latestCharge;
    }

    await payment.save();

    return payment;
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
      case "payment_intent.succeeded": {
        console.log("💰 Processing payment_intent.succeeded");

        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // ✅ ADD: Booking deposit branch (isolated; does NOT affect orders)
        const purpose = (paymentIntent.metadata as any)?.paymentPurpose;

        if (purpose === "BOOKING_DEPOSIT") {
          const bookingId = (paymentIntent.metadata as any)?.bookingId;

          if (!bookingId) {
            console.error("❌ BOOKING_DEPOSIT missing bookingId metadata");
            break; // do not crash webhook
          }

          // Stripe amounts are in smallest currency unit (cents)
          const amountSmallest =
            typeof paymentIntent.amount_received === "number"
              ? paymentIntent.amount_received
              : paymentIntent.amount;

          const amountMainUnit = amountSmallest / 100;

          const currencyUpper = (paymentIntent.currency || stripePaymentCurrency).toUpperCase();

          console.log("✅ BOOKING_DEPOSIT detected, confirming booking:", bookingId);

          await confirmBookingFromStripeSuccess({
            bookingId: String(bookingId),
            paymentIntentId: paymentIntent.id,
            amount: amountMainUnit,
            currency: currencyUpper,
          });

          // Important: stop here so we DON'T run order payment logic
          break;
        }

        // ✅ Existing order behavior stays identical
        await this.handlePaymentSuccess(paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        console.log("❌ Processing payment_intent.payment_failed");

        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // ✅ ADD: if this was booking deposit, just log and stop (no order impact)
        const purpose = (paymentIntent.metadata as any)?.paymentPurpose;
        if (purpose === "BOOKING_DEPOSIT") {
          console.log("⚠️ BOOKING_DEPOSIT payment failed for bookingId:", (paymentIntent.metadata as any)?.bookingId);
          break;
        }

        // ✅ Existing order behavior stays identical
        await this.handlePaymentFailed(paymentIntent);
        break;
      }

      case "payment_intent.canceled": {
        console.log("🚫 Processing payment_intent.canceled");

        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // ✅ ADD: if this was booking deposit, just log and stop (no order impact)
        const purpose = (paymentIntent.metadata as any)?.paymentPurpose;
        if (purpose === "BOOKING_DEPOSIT") {
          console.log("⚠️ BOOKING_DEPOSIT payment canceled for bookingId:", (paymentIntent.metadata as any)?.bookingId);
          break;
        }

        // ✅ Existing order behavior stays identical
        await this.handlePaymentCanceled(paymentIntent);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await stripeConnectService.handleAccountUpdated(account);
        break;
      }

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
    payment.metadata = payment.metadata || {};

    const latestCharge = paymentIntent.latest_charge;
    if (typeof latestCharge === "string") {
      payment.metadata.stripeChargeId = latestCharge;
    }

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

    const payoutMetadata = payment.metadata || {};
    const displayGrossAmount = Number(payment.amount || 0);
    const transferGrossAmount = normalizePayoutAmount(displayGrossAmount, payment.currency);

    payment.status = PaymentStatus.RELEASED;

    const existingTransferId = payoutMetadata.stripeTransferId;
    const platformFeePercent = env.STRIPE_TRANSFER_FEE_PERCENT;
    const feeAmount = Math.round(displayGrossAmount * (platformFeePercent / 100) * 100) / 100;
    const netAmount = Math.max(0, displayGrossAmount - feeAmount);

    payoutMetadata.payoutGrossAmount = displayGrossAmount;
    payoutMetadata.payoutFeePercent = platformFeePercent;
    payoutMetadata.payoutFeeAmount = feeAmount;
    payoutMetadata.payoutNetAmount = netAmount;
    payoutMetadata.payoutAttemptedAt = new Date().toISOString();
    payoutMetadata.payoutStripeGrossAmount = transferGrossAmount;
    payoutMetadata.payoutStripeCurrency = stripePaymentCurrency;

    if (!existingTransferId) {
      const eligible = await stripeConnectService.isUserEligibleForPayout(payment.sellerId.toString());
      const sourceTransaction =
        typeof payoutMetadata.stripeChargeId === "string"
          ? payoutMetadata.stripeChargeId
          : await stripeConnectService.resolveLatestChargeId(payment.providerPaymentId);

      if (sourceTransaction) {
        payoutMetadata.stripeChargeId = sourceTransaction;
      }

      if (eligible && netAmount > 0) {
        const transferAmount = normalizePayoutAmount(netAmount, payment.currency);
        try {
          const transfer = await stripeConnectService.createTransferToUser({
            userId: payment.sellerId.toString(),
            amount: transferAmount,
            currency: stripePaymentCurrency,
            description: `Order ${orderId} payout`,
            transferGroup: `ORDER_${orderId}`,
            metadata: {
              orderId,
              paymentId: payment._id.toString(),
              sellerId: payment.sellerId.toString(),
            },
            idempotencyKey: `order-release-${payment._id.toString()}-${stripePaymentCurrency}-${transferAmount.toFixed(2)}`,
            sourceTransaction,
          });

          payoutMetadata.stripeTransferId = transfer.id;
          payoutMetadata.payoutStatus = "TRANSFER_CREATED";
          payoutMetadata.payoutError = null;
        } catch (error: any) {
          payoutMetadata.payoutStatus = "TRANSFER_FAILED";
          payoutMetadata.payoutError = error?.message || "Unknown transfer error";
        }
      } else {
        payoutMetadata.payoutStatus = "SKIPPED_NOT_ELIGIBLE";
      }
    }

    payment.metadata = payoutMetadata;
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

  async confirmBookingDepositPayment(args: {
    bookingId: string;
    buyerId: string;
    paymentIntentId: string;
  }) {
    const booking = await ServiceBooking.findById(args.bookingId);

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    if (String(booking.buyerId) !== String(args.buyerId)) {
      throw new AppError("You are not authorized to confirm this booking payment", 403);
    }

    if (booking.status === "CONFIRMED") {
      return booking;
    }

    if (booking.status !== "PROVIDER_ACCEPTED") {
      throw new AppError("This booking is not ready for payment confirmation", 400);
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(args.paymentIntentId);

    if (!paymentIntent) {
      throw new AppError("Payment not found", 404);
    }

    const paymentPurpose = (paymentIntent.metadata as any)?.paymentPurpose;
    const paymentBookingId = (paymentIntent.metadata as any)?.bookingId;

    if (paymentPurpose !== "BOOKING_DEPOSIT" || String(paymentBookingId) !== String(args.bookingId)) {
      throw new AppError("This payment does not belong to the selected booking", 400);
    }

    if (!["succeeded", "processing", "requires_capture"].includes(paymentIntent.status)) {
      throw new AppError("Payment has not completed successfully yet", 400);
    }

    const amountSmallest =
      typeof paymentIntent.amount_received === "number" && paymentIntent.amount_received > 0
        ? paymentIntent.amount_received
        : paymentIntent.amount;

    return confirmBookingFromStripeSuccess({
      bookingId: args.bookingId,
      paymentIntentId: paymentIntent.id,
      amount: amountSmallest / 100,
      currency: (paymentIntent.currency || stripePaymentCurrency).toUpperCase(),
    });
  }

  /**
   * Initiate Booking Deposit PaymentIntent (Service Booking)
   * NOTE: This does NOT create Payment DB record (separate from orders).
   * It ONLY creates a Stripe PaymentIntent and returns clientSecret.
   */
  async initiateBookingDeposit(args: {
    bookingId: string;
    amount: number;
    currency: string;
  }) {
    const amountSmallest = Math.round(args.amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountSmallest,
      currency: args.currency.toLowerCase(),
      metadata: {
        paymentPurpose: "BOOKING_DEPOSIT",
        bookingId: args.bookingId,
      },
      description: `Booking deposit for booking #${args.bookingId.slice(-8)}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: args.amount,
      currency: args.currency.toLowerCase(),
      metadata: {
        paymentPurpose: "BOOKING_DEPOSIT",
        bookingId: args.bookingId,
      },
    };
  }
}
