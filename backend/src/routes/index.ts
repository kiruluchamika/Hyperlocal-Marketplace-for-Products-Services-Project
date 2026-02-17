import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import listingRoutes from "./listingRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/listings", listingRoutes);

export default router;
