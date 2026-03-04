import { Router } from "express";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import { confirmBookingFromStripeSuccess } from "../services/serviceBookingService";

const router = Router();

/**
 * @openapi
 * /servicebookings-test/{id}/force-confirm:
 *   post:
 *     tags: [ServiceBooking]
 *     summary: TEST ONLY - Force confirm booking (simulate Stripe webhook)
 *     description: |
 *       This endpoint is for local testing only.
 *       It simulates Stripe payment success and confirms the booking.
 *       Remove this endpoint after demo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking confirmed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 */
router.post("/:id/force-confirm", auth, requireRole(["user", "admin"]), async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    const result = await confirmBookingFromStripeSuccess({
      bookingId,
      paymentIntentId: "pi_manual_test",
      amount: 100,
      currency: "LKR",
    });

    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

export default router;