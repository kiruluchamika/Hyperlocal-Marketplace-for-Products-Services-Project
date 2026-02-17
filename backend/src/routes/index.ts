import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import listingRoutes from "./listingRoutes";
import categoryRoutes from "./categoryRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/listings", listingRoutes);
router.use("/categories", categoryRoutes);

export default router;
