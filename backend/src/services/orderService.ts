/**
 * Order Service
 * 
 * Implements all business logic for order lifecycle management.
 * 
 * BUSINESS RULES:
 * 1. Buyer can only order active, available PRODUCT listings with BUY_NOW mode
 * 2. Buyer cannot order their own listing
 * 3. Seller can only accept/reject/start orders for their listings
 * 4. Payment must be HELD before seller can accept
 * 5. Only PENDING orders can be accepted/rejected/cancelled
 * 6. Only ACCEPTED orders can be started (move to IN_PROGRESS)
 * 7. Only IN_PROGRESS orders can be completed
 * 8. Completed orders trigger payment RELEASE
 * 9. Cancelled/rejected orders trigger payment REFUND
 * 
 * OTP DELIVERY:
 * - Generated when seller accepts order (if enabled)
 * - Buyer receives OTP to share with seller physically
 * - Seller enters OTP to confirm delivery
 * - Prevents fraudulent completion claims
 */

import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import Order, { OrderStatus, DeliveryMethod } from "../models/Order";
import Payment, { PaymentStatus } from "../models/Payment";
import { PaymentService } from "./paymentService";
import { EmailService } from "./emailService";
import ProductListing from "../models/ProductListing";

export class OrderService {
  private paymentService: PaymentService;
  private emailService: EmailService;
  
  constructor() {
    this.paymentService = new PaymentService();
    this.emailService = new EmailService();
  }
  
  /**
   * Create Order
   * Validates listing eligibility and creates order with snapshots
   */
  async createOrder(
    buyerId: string,
    data: {
      listingId: string;
      quantity: number;
      deliveryMethod: DeliveryMethod;
      deliveryAddress?: string;
      note?: string;
    }
  ) {
    // 1. Fetch listing
    const listing = await ProductListing.findById(data.listingId);
    
    if (!listing) {
      throw new AppError("Listing not found", 404);
    }
    
    // 2. Validate listing eligibility
    if (listing.type !== "PRODUCT") {
      throw new AppError("Only PRODUCT listings can be ordered", 400);
    }
    
    if (listing.transactionMode !== "BUY_NOW") {
      throw new AppError("Only BUY_NOW listings can be ordered", 400);
    }
    
    // Check listing is active
    if (listing.status !== "ACTIVE") {
      throw new AppError("Listing is not active", 400);
    }
    
    // 3. Prevent self-purchase
    if (listing.ownerId.toString() === buyerId) {
      throw new AppError("You cannot order your own listing", 400);
    }
    
    // 4. Validate delivery address if DELIVERY method
    if (data.deliveryMethod === DeliveryMethod.DELIVERY && !data.deliveryAddress) {
      throw new AppError("Delivery address is required for DELIVERY method", 400);
    }
    
    // 5. Calculate total
    const totalAmount = listing.price * data.quantity;
    
    // 6. Capture pickup location if PICKUP method
    let pickupLocationSnapshot: string | undefined;
    if (data.deliveryMethod === DeliveryMethod.PICKUP) {
      // Build pickup location from listing location
      const locationParts = [];
      if (listing.location?.address) {
        locationParts.push(listing.location.address);
      }
      if (listing.location?.city) {
        locationParts.push(listing.location.city);
      }
      pickupLocationSnapshot = locationParts.join(", ") || "Location not specified";
    }
    
    // 7. Create order with snapshots
    const order = await Order.create({
      buyerId,
      sellerId: listing.ownerId,
      listingId: listing._id,
      titleSnapshot: listing.title,
      unitPriceSnapshot: listing.price,
      quantity: data.quantity,
      totalAmount,
      deliveryMethod: data.deliveryMethod,
      deliveryAddress: data.deliveryAddress,
      pickupLocationSnapshot,
      note: data.note,
      status: OrderStatus.PENDING
    });
    
    // Populate for response
    await order.populate("buyerId", "name email");
    await order.populate("sellerId", "name email");
    await order.populate("listingId", "title price");
    
    return {
      order,
      message: "Order created successfully. Please proceed to payment.",
      nextStep: "INITIATE_PAYMENT"
    };
  }
  
  /**
   * Accept Order (Seller)
   * Requires payment to be HELD. Optionally generates OTP.
   */
  async acceptOrder(orderId: string, sellerId: string) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    
    // Verify seller ownership
    if (order.sellerId.toString() !== sellerId) {
      throw new AppError("You are not authorized to accept this order", 403);
    }
    
    // Verify status
    if (order.status !== OrderStatus.PENDING) {
      throw new AppError("Only PENDING orders can be accepted", 400);
    }
    
    // Verify payment is HELD
    const payment = await Payment.findById(order.paymentId);
    
    if (!payment || payment.status !== PaymentStatus.HELD) {
      throw new AppError(
        "Payment must be completed and held before accepting order",
        400
      );
    }
    
    // Update status
    order.status = OrderStatus.ACCEPTED;
    
    // Generate OTP if enabled
    let otp: string | undefined;
    if (env.ENABLE_OTP_DELIVERY === "true") {
      otp = this.generateOTP();
      order.deliveryOtpHash = await bcrypt.hash(otp, 10);
      order.deliveryOtpExpiresAt = new Date(
        Date.now() + parseInt(env.OTP_EXPIRY_MINUTES) * 60 * 1000
      );
      order.deliveryOtpAttempts = 0;
    }
    
    await order.save();
    
    // Send OTP via email if generated
    if (otp) {
      // Populate buyer details if not already populated
      if (!order.populated("buyerId")) {
        await order.populate("buyerId", "name email");
      }
      
      const buyer = order.buyerId as any;
      
      // Send OTP email asynchronously (non-blocking)
      this.emailService.sendOTP(
        buyer.email,
        buyer.name,
        otp,
        order.titleSnapshot
      ).catch(error => {
        console.error("Failed to send OTP email:", error);
        // Don't throw - email failure shouldn't block order acceptance
      });
    }
    
    return {
      order,
      otp, // Return OTP to be sent to buyer
      message: "Order accepted successfully"
    };
  }
  
  /**
   * Reject Order (Seller)
   * Triggers payment refund
   */
  async rejectOrder(orderId: string, sellerId: string, reason?: string) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    
    // Verify seller ownership
    if (order.sellerId.toString() !== sellerId) {
      throw new AppError("You are not authorized to reject this order", 403);
    }
    
    // Verify status
    if (order.status !== OrderStatus.PENDING) {
      throw new AppError("Only PENDING orders can be rejected", 400);
    }
    
    // Update status
    order.status = OrderStatus.REJECTED;
    await order.save();
    
    // Refund payment if exists
    if (order.paymentId) {
      await this.paymentService.refundPayment(order._id.toString());
    }
    
    return {
      order,
      message: `Order rejected${reason ? `: ${reason}` : ""}`
    };
  }
  
  /**
   * Start Order (Seller)
   * Moves from ACCEPTED to IN_PROGRESS
   */
  async startOrder(orderId: string, sellerId: string) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    
    // Verify seller ownership
    if (order.sellerId.toString() !== sellerId) {
      throw new AppError("You are not authorized to start this order", 403);
    }
    
    // Verify status
    if (order.status !== OrderStatus.ACCEPTED) {
      throw new AppError("Only ACCEPTED orders can be started", 400);
    }
    
    // Update status
    order.status = OrderStatus.IN_PROGRESS;
    await order.save();
    
    return {
      order,
      message: "Order marked as in progress"
    };
  }
  
  /**
   * Cancel Order (Buyer)
   * Only PENDING orders can be cancelled. Triggers refund.
   */
  async cancelOrder(orderId: string, buyerId: string, reason?: string) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    
    // Verify buyer ownership
    if (order.buyerId.toString() !== buyerId) {
      throw new AppError("You are not authorized to cancel this order", 403);
    }
    
    // Verify status
    if (order.status !== OrderStatus.PENDING) {
      throw new AppError("Only PENDING orders can be cancelled", 400);
    }
    
    // Update status
    order.status = OrderStatus.CANCELLED;
    await order.save();
    
    // Refund payment if exists
    if (order.paymentId) {
      await this.paymentService.refundPayment(order._id.toString());
    }
    
    return {
      order,
      message: `Order cancelled${reason ? `: ${reason}` : ""}`
    };
  }
  
  /**
   * Confirm Delivery Received (Buyer)
   * Completes order without OTP. Releases payment.
   */
  async confirmReceived(orderId: string, buyerId: string) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    
    // Verify buyer ownership
    if (order.buyerId.toString() !== buyerId) {
      throw new AppError("You are not authorized to confirm this order", 403);
    }
    
    // Verify status
    if (order.status !== OrderStatus.IN_PROGRESS) {
      throw new AppError("Only IN_PROGRESS orders can be confirmed", 400);
    }

    // When OTP delivery is enabled, buyer must confirm with OTP.
    if (env.ENABLE_OTP_DELIVERY === "true" && order.deliveryOtpExpiresAt) {
      throw new AppError(
        "OTP confirmation is required. Use confirm-received-otp endpoint.",
        400
      );
    }
    
    // Update status
    order.status = OrderStatus.COMPLETED;
    await order.save();
    
    // Release payment
    await this.paymentService.releasePayment(order._id.toString());
    
    return {
      order,
      message: "Order completed successfully. Payment released to seller."
    };
  }

  /**
   * Confirm Delivery Received with OTP (Buyer)
   * Buyer verifies OTP from email and completes order. Releases payment.
   */
  async confirmReceivedWithOtp(orderId: string, buyerId: string, otp: string) {
    const order = await Order.findById(orderId).select("+deliveryOtpHash");

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    // Verify buyer ownership
    if (order.buyerId.toString() !== buyerId) {
      throw new AppError("You are not authorized to confirm this order", 403);
    }

    // Verify status
    if (order.status !== OrderStatus.IN_PROGRESS) {
      throw new AppError("Only IN_PROGRESS orders can be confirmed", 400);
    }

    // Verify OTP is enabled for this order
    if (!order.deliveryOtpHash) {
      throw new AppError("OTP confirmation is not enabled for this order", 400);
    }

    // Check expiry
    if (order.deliveryOtpExpiresAt && order.deliveryOtpExpiresAt < new Date()) {
      throw new AppError("OTP has expired", 400);
    }

    // Check attempts (max 3)
    if (order.deliveryOtpAttempts && order.deliveryOtpAttempts >= 3) {
      throw new AppError("Maximum OTP attempts exceeded", 400);
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, order.deliveryOtpHash);

    if (!isValid) {
      order.deliveryOtpAttempts = (order.deliveryOtpAttempts || 0) + 1;
      await order.save();

      throw new AppError(
        `Invalid OTP. ${3 - order.deliveryOtpAttempts} attempts remaining.`,
        400
      );
    }

    // OTP valid - complete order
    order.status = OrderStatus.COMPLETED;
    order.deliveryOtpHash = undefined;
    order.deliveryOtpExpiresAt = undefined;
    order.deliveryOtpAttempts = 0;
    await order.save();

    // Release payment
    await this.paymentService.releasePayment(order._id.toString());

    return {
      order,
      message: "OTP verified. Order completed successfully. Payment released to seller."
    };
  }
  
  /**
   * Confirm Delivery with OTP (Seller)
   * Deprecated: seller completion is disabled in favor of buyer OTP confirmation.
   */
  async confirmDeliveryWithOtp(orderId: string, sellerId: string, otp: string) {
    void orderId;
    void sellerId;
    void otp;

    throw new AppError(
      "Seller OTP completion is disabled. Buyer must confirm via confirm-received-otp.",
      400
    );
  }

  /**
   * Update Delivery Details (Buyer)
   * Replace complete delivery configuration
   * Only allowed for PENDING orders
   */
  async updateDeliveryDetails(
    orderId: string,
    buyerId: string,
    deliveryData: {
      deliveryMethod: DeliveryMethod;
      deliveryAddress?: string;
    }
  ) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    
    // Authorization check
    if (order.buyerId.toString() !== buyerId) {
      throw new AppError("Not authorized to update this order", 403);
    }
    
    // Status check - only PENDING (before seller accepts)
    if (order.status !== OrderStatus.PENDING) {
      throw new AppError(
        "Cannot update delivery details after seller has accepted the order",
        400
      );
    }
    
    // Check if payment already initiated
    const payment = await Payment.findOne({ orderId: order._id });
    if (payment && payment.status !== PaymentStatus.INITIATED) {
      // Allow update only if payment not yet held
      throw new AppError(
        "Cannot update delivery details after payment is confirmed",
        400
      );
    }
    
    // Update delivery configuration
    order.deliveryMethod = deliveryData.deliveryMethod;
    
    if (deliveryData.deliveryMethod === DeliveryMethod.DELIVERY) {
      order.deliveryAddress = deliveryData.deliveryAddress;
    } else {
      // Clear address if switching to PICKUP
      order.deliveryAddress = undefined;
    }
    
    await order.save();
    
    return order;
  }
  
  /**
   * Get Order by ID
   * With role-based access control
   */
  async getOrderById(orderId: string, userId: string, role: string) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    
    // Authorization
    const isBuyer = order.buyerId.toString() === userId;
    const isSeller = order.sellerId.toString() === userId;
    const isAdmin = role === "admin";
    
    if (!isBuyer && !isSeller && !isAdmin) {
      throw new AppError("You are not authorized to view this order", 403);
    }

    await order.populate("buyerId", "name email");
    await order.populate("sellerId", "name email");
    await order.populate("listingId", "title price");
    await order.populate("paymentId");
    
    // Attach allowed actions based on role and status
    const actionsAllowed = this.getActionsAllowed(order, userId, role);
    
    return {
      order,
      actionsAllowed
    };
  }
  
  /**
   * List Orders
   * Filtered by role (buyer sees own, seller sees orders for their listings)
   */
  async listOrders(
    userId: string,
    role: string,
    filters: {
      status?: OrderStatus;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;
    
    // Build query based on role
    const query: any = {};
    
    if (role === "buyer") {
      query.buyerId = userId;
    } else if (role === "seller") {
      query.sellerId = userId;
    }
    // admin sees all
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("buyerId", "name email")
        .populate("sellerId", "name email")
        .populate("listingId", "title price")
        .populate("paymentId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(query)
    ]);
    
    // Attach actions for each order
    const ordersWithActions = orders.map((order) => ({
      order,
      actionsAllowed: this.getActionsAllowed(order, userId, role)
    }));
    
    return {
      orders: ordersWithActions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get Allowed Actions
   * Returns UI-friendly list of actions based on role and order status
   */
  private getActionsAllowed(order: any, userId: string, role: string): string[] {
    const actions: string[] = [];
    const toIdString = (value: any): string | null => {
      if (!value) return null;

      // Populated refs have an _id, plain refs can already be ObjectId/string.
      if (value._id) {
        return value._id.toString();
      }

      return value.toString();
    };

    const buyerId = toIdString(order.buyerId);
    const sellerId = toIdString(order.sellerId);
    const paymentStatus = order.paymentId?.status as PaymentStatus | undefined;
    const canInitiatePayment = !order.paymentId || paymentStatus === PaymentStatus.FAILED;

    const isBuyer = buyerId === userId;
    const isSeller = sellerId === userId;
    
    if (isBuyer) {
      if (order.status === OrderStatus.PENDING) {
        actions.push("CANCEL");

        if (canInitiatePayment) {
          actions.push("INITIATE_PAYMENT");
        }
      }
      if (order.status === OrderStatus.IN_PROGRESS) {
        if (env.ENABLE_OTP_DELIVERY === "true" && order.deliveryOtpExpiresAt) {
          actions.push("CONFIRM_RECEIVED_WITH_OTP");
        } else {
          actions.push("CONFIRM_RECEIVED");
        }
      }
    }
    
    if (isSeller) {
      if (order.status === OrderStatus.PENDING) {
        actions.push("ACCEPT", "REJECT");
      }
      if (order.status === OrderStatus.ACCEPTED) {
        actions.push("START");
      }
      if (order.status === OrderStatus.IN_PROGRESS) {
        if (env.ENABLE_OTP_DELIVERY === "true" && order.deliveryOtpExpiresAt) {
          // Buyer should confirm with OTP; seller waits.
        } else {
          actions.push("MARK_COMPLETED");
        }
      }
    }
    
    if (role === "admin") {
      actions.push("OVERRIDE_STATUS");
    }
    
    return actions;
  }
  
  /**
   * Delete Order (Archive) - Admin only
   * Soft deletes order and optionally refunds payment
   */
  async deleteOrder(
    orderId: string,
    adminId: string,
    options: {
      reason?: string;
      refund?: boolean;
    } = {}
  ) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    
    // Check if already deleted
    if (order.isDeleted) {
      throw new AppError("Order is already deleted/archived", 400);
    }
    
    // Soft delete
    order.isDeleted = true;
    order.deletedAt = new Date();
    
    // Refund payment if requested and order was paid
    if (options.refund !== false && order.paymentId) {
      const payment = await Payment.findById(order.paymentId);
      
      if (payment) {
        // Only refund if payment is HELD or RELEASED
        if (
          payment.status === PaymentStatus.HELD ||
          payment.status === PaymentStatus.RELEASED
        ) {
          // If payment was already released to seller, pull it back
          if (payment.status === PaymentStatus.RELEASED) {
            throw new AppError(
              "Cannot refund completed order. Use manual refund process.",
              400
            );
          }
          
          // Refund the held payment
          payment.status = PaymentStatus.REFUNDED;
          payment.updatedAt = new Date();
          await payment.save();
        }
      }
    }
    
    await order.save();
    
    // Populate for response
    await order.populate("buyerId", "name email");
    await order.populate("sellerId", "name email");
    
    return {
      order,
      message: `Order archived successfully${options.reason ? ` - Reason: ${options.reason}` : ""}`
    };
  }
  
  /**
   * Generate 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
