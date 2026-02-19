/**
 * Order Controller
 * 
 * Handles HTTP requests for order operations.
 * Implements role-based access control at the controller level.
 */

import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { OrderService } from "../services/orderService";
import { DeliveryMethod } from "../models/Order";

const orderService = new OrderService();

/**
 * POST /orders
 * Create new order (Buyer only)
 */
export const createOrder = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const buyerId = req.user!.id;
    const { listingId, quantity, deliveryMethod, deliveryAddress, note } = req.body;
    
    const result = await orderService.createOrder(buyerId, {
      listingId,
      quantity,
      deliveryMethod: deliveryMethod as DeliveryMethod,
      deliveryAddress,
      note
    });
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        order: result.order,
        nextStep: result.nextStep
      }
    });
  }
);

/**
 * GET /orders
 * List orders (filtered by role)
 */
export const listOrders = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { status, page, limit } = req.query;
    
    const result = await orderService.listOrders(userId, role, {
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });
    
    res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  }
);

/**
 * GET /orders/:id
 * Get order by ID
 */
export const getOrderById = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;
    
    const result = await orderService.getOrderById(id, userId, role);
    
    res.status(200).json({
      success: true,
      data: result
    });
  }
);

/**
 * PATCH /orders/:id/accept
 * Accept order (Seller only)
 */
export const acceptOrder = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const sellerId = req.user!.id;
    
    const result = await orderService.acceptOrder(id, sellerId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        order: result.order,
        // OTP returned only if enabled (to be sent to buyer)
        ...(result.otp && { deliveryOtp: result.otp })
      }
    });
  }
);

/**
 * PATCH /orders/:id/reject
 * Reject order (Seller only)
 */
export const rejectOrder = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const sellerId = req.user!.id;
    const { reason } = req.body;
    
    const result = await orderService.rejectOrder(id, sellerId, reason);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.order
    });
  }
);

/**
 * PATCH /orders/:id/start
 * Start order (Seller only) - moves to IN_PROGRESS
 */
export const startOrder = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const sellerId = req.user!.id;
    
    const result = await orderService.startOrder(id, sellerId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.order
    });
  }
);

/**
 * PATCH /orders/:id/cancel
 * Cancel order (Buyer only)
 */
export const cancelOrder = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const buyerId = req.user!.id;
    const { reason } = req.body;
    
    const result = await orderService.cancelOrder(id, buyerId, reason);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.order
    });
  }
);

/**
 * PATCH /orders/:id/confirm-received
 * Confirm delivery received (Buyer only)
 */
export const confirmReceived = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const buyerId = req.user!.id;
    
    const result = await orderService.confirmReceived(id, buyerId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.order
    });
  }
);

/**
 * POST /orders/:id/confirm-delivery
 * Confirm delivery with OTP (Seller only)
 */
export const confirmDeliveryWithOtp = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const sellerId = req.user!.id;
    const { otp } = req.body;
    
    const result = await orderService.confirmDeliveryWithOtp(id, sellerId, otp);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.order
    });
  }
);
