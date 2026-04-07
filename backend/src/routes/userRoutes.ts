import { Router } from "express";
import {
	changeMyPassword,
	createStripeConnectOnboarding,
	getAllUsers,
	getMe,
	getStripeConnectBalance,
	getStripeConnectStatus,
	updateMe,
} from "../controllers/userController";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import { validate } from "../middlewares/validate";
import {
	changePasswordSchema,
	stripeConnectOnboardingSchema,
	updateProfileSchema,
} from "../validators/userSchemas";

const router = Router();

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *       401:
 *         description: Unauthorized
 */
router.get("/me", auth, getMe);

/**
 * @openapi
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.patch("/me", auth, validate(updateProfileSchema), updateMe);

/**
 * @openapi
 * /users/me/password:
 *   patch:
 *     tags: [Users]
 *     summary: Change current user password
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Unauthorized
 */
router.patch("/me/password", auth, validate(changePasswordSchema), changeMyPassword);

router.post(
	"/stripe-connect/onboarding",
	auth,
	validate(stripeConnectOnboardingSchema),
	createStripeConnectOnboarding
);

router.get("/stripe-connect/status", auth, getStripeConnectStatus);
router.get("/stripe-connect/balance", auth, getStripeConnectBalance);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", auth, requireRole(["admin"]), getAllUsers);

export default router;
