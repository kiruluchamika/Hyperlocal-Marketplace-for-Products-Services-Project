import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import orderRoutes from "./orderRoutes";
import paymentRoutes from "./paymentRoutes";
import listingRoutes from "./listingRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/listings", listingRoutes);

export default router;
