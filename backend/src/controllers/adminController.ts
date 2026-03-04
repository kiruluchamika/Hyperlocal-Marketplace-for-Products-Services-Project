import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as adminService from "../services/adminService";

/* GET /api/admin/stats */
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getDashboardStats();
  res.json(data);
});

/* GET /api/admin/stats/charts */
export const getChartData = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getChartData();
  res.json(data);
});

/* GET /api/admin/users */
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, role, status } = req.query;
  const data = await adminService.getAllUsersAdmin({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string | undefined,
    role: role as string | undefined,
    status: status as string | undefined,
  });
  res.json(data);
});

/* PATCH /api/admin/users/:id/status */
export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { action } = req.body;
  const user = await adminService.updateUserStatus(req.params.id, action);
  res.json({ message: `User ${action}d successfully`, user });
});

/* GET /api/admin/orders */
export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status } = req.query;
  const data = await adminService.getAllOrdersAdmin({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status: status as string | undefined,
  });
  res.json(data);
});

/* GET /api/admin/payments */
export const getAllPayments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status } = req.query;
  const data = await adminService.getAllPayments({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status: status as string | undefined,
  });
  res.json(data);
});

/* GET /api/admin/bookings */
export const getAllBookings = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status } = req.query;
  const data = await adminService.getAllBookings({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status: status as string | undefined,
  });
  res.json(data);
});

/* GET /api/admin/listings */
export const getAllListings = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, search } = req.query;
  const data = await adminService.getAllListingsAdmin({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status: status as string | undefined,
    search: search as string | undefined,
  });
  res.json(data);
});
