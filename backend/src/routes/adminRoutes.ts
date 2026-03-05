import { Router } from "express";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import * as adminCtrl from "../controllers/adminController";

const router = Router();

// All admin routes require auth + admin role
router.use(auth, requireRole(["admin"]));

/* Dashboard stats */
router.get("/stats", adminCtrl.getStats);
router.get("/stats/charts", adminCtrl.getChartData);

/* Users management */
router.get("/users", adminCtrl.getAllUsers);
router.patch("/users/:id/status", adminCtrl.updateUserStatus);

/* Orders */
router.get("/orders", adminCtrl.getAllOrders);

/* Payments */
router.get("/payments", adminCtrl.getAllPayments);

/* Bookings */
router.get("/bookings", adminCtrl.getAllBookings);

/* Listings */
router.get("/listings", adminCtrl.getAllListings);

export default router;
