import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import orderRoutes from "./orderRoutes";
import paymentRoutes from "./paymentRoutes";
import listingRoutes from "./listingRoutes";
import categoryRoutes from "./categoryRoutes";
import serviceSellingRoutes from "./serviceSellingRoutes";
import otpRoutes from "./otpRoutes";


const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/listings", listingRoutes);
router.use("/categories", categoryRoutes);
router.use("/serviceselling", serviceSellingRoutes);
router.use("/otp", otpRoutes);


export default router;
