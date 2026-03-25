import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import orderRoutes from "./orderRoutes";
import paymentRoutes from "./paymentRoutes";
import notificationRoutes from "./notificationRoutes";
import listingRoutes from "./listingRoutes";
import categoryRoutes from "./categoryRoutes";
import serviceSellingRoutes from "./serviceSellingRoutes";
import serviceBookingRoutes from "./serviceBookingRoutes";
import otpRoutes from "./otpRoutes";
import geoRoutes from "./geoRoutes";
import adminRoutes from "./adminRoutes";

import bookingTestRoutes from "./bookingTestRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/notifications", notificationRoutes);
router.use("/listings", listingRoutes);
router.use("/categories", categoryRoutes);
router.use("/serviceselling", serviceSellingRoutes);
router.use("/servicebookings", serviceBookingRoutes);
router.use("/otp", otpRoutes);
router.use("/geo-search", geoRoutes);
router.use("/admin", adminRoutes);

router.use("/servicebookings-test", bookingTestRoutes);


export default router;