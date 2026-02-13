import { Router } from "express";
import { getMe, getAllUsers } from "../controllers/userController";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";

const router = Router();

router.get("/me", auth, getMe);
router.get("/", auth, requireRole(["admin"]), getAllUsers);

export default router;
