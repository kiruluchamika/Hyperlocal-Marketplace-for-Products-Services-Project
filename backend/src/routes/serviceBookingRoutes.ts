import { Router } from "express";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import { validate } from "../middlewares/validate";

import {
  createServiceBookingSchema,
  bookingIdParamSchema,
  providerDecisionSchema,
  slotsQuerySchema,
  providerBookingsQuerySchema,
  buyerBookingsQuerySchema,
} from "../validators/serviceBookingSchemas";

import * as svc from "../services/serviceBookingService";
import { PaymentService } from "../services/paymentService";

const router = Router();
const paymentService = new PaymentService();

/**
 * @openapi
 * /servicebookings:
 *   post:
 *     tags: [ServiceBooking]
 *     summary: Create a booking request (buyer)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceId, startAt, durationMinutes]
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: ServiceSelling (ad) id
 *                 example: "65f1c2d3a1b2c3d4e5f67890"
 *               startAt:
 *                 type: string
 *                 format: date-time
 *                 description: Booking start date-time (ISO)
 *                 example: "2026-03-01T10:00:00.000Z"
 *               durationMinutes:
 *                 type: integer
 *                 description: Duration in minutes
 *                 example: 60
 *               note:
 *                 type: string
 *                 description: Optional note to provider
 *                 example: "Need help for 1 hour"
 *     responses:
 *       201:
 *         description: Booking created (PENDING)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.post(
  "/",
  auth,
  requireRole(["user"]),
  validate(createServiceBookingSchema),
  async (req: any, res, next) => {
    try {
      const created = await svc.createBooking(req.user.id, req.body);
      res.status(201).json({ success: true, data: created });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @openapi
 * /servicebookings/me:
 *   get:
 *     tags: [ServiceBooking]
 *     summary: Get my bookings (buyer) - supports optional status filter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROVIDER_ACCEPTED, CONFIRMED, REJECTED, CANCELLED]
 *     responses:
 *       200:
 *         description: Buyer bookings list
 *       401:
 *         description: Authentication required
 */
router.get(
  "/me",
  auth,
  requireRole(["user"]),
  validate(buyerBookingsQuerySchema, "query"),
  async (req: any, res, next) => {
    try {
      const result = await svc.listMyBookings(req.user.id, req.query?.status);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @openapi
 * /servicebookings/provider/me:
 *   get:
 *     tags: [ServiceBooking]
 *     summary: Get bookings for me (provider) - supports optional status filter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROVIDER_ACCEPTED, CONFIRMED, REJECTED, CANCELLED]
 *     responses:
 *       200:
 *         description: Provider bookings list
 *       401:
 *         description: Authentication required
 */
router.get(
  "/provider/me",
  auth,
  requireRole(["user"]),
  validate(providerBookingsQuerySchema, "query"),
  async (req: any, res, next) => {
    try {
      const result = await svc.listProviderBookings(req.user.id, req.query?.status);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @openapi
 * /servicebookings/slots:
 *   get:
 *     tags: [ServiceBooking]
 *     summary: Get confirmed busy slots for a service (CONFIRMED only)
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ServiceSelling (ad) id
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Optional range start (ISO)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Optional range end (ISO)
 *     responses:
 *       200:
 *         description: Busy slots (array of {startAt, endAt})
 *       400:
 *         description: Validation error
 */
router.get(
  "/slots",
  validate(slotsQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const result = await svc.getConfirmedSlots(req.query);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @openapi
 * /servicebookings/{id}/cancel:
 *   patch:
 *     tags: [ServiceBooking]
 *     summary: Cancel booking (buyer only, only when PENDING)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       400:
 *         description: Only PENDING bookings can be cancelled
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 */
router.patch(
  "/:id/cancel",
  auth,
  requireRole(["user"]),
  validate(bookingIdParamSchema, "params"),
  async (req: any, res, next) => {
    try {
      const result = await svc.cancelBooking(req.params.id, req.user.id);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @openapi
 * /servicebookings/{id}/decision:
 *   patch:
 *     tags: [ServiceBooking]
 *     summary: Provider accept/reject booking (provider only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [ACCEPT, REJECT]
 *                 example: ACCEPT
 *     responses:
 *       200:
 *         description: Booking updated to PROVIDER_ACCEPTED or REJECTED
 *       400:
 *         description: Only PENDING bookings can be decided
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 */
router.patch(
  "/:id/decision",
  auth,
  requireRole(["user"]),
  validate(bookingIdParamSchema, "params"),
  validate(providerDecisionSchema),
  async (req: any, res, next) => {
    try {
      const result = await svc.providerDecision(
        req.params.id,
        req.user.id,
        req.body.action
      );
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @openapi
 * /servicebookings/{id}/deposit/initiate:
 *   post:
 *     tags: [ServiceBooking]
 *     summary: Initiate booking deposit PaymentIntent (buyer, only after provider accepted)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stripe PaymentIntent details for booking deposit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentIntentId:
 *                   type: string
 *                 clientSecret:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 currency:
 *                   type: string
 *                 metadata:
 *                   type: object
 *       400:
 *         description: Deposit allowed only after provider accepts
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 */
router.post(
  "/:id/deposit/initiate",
  auth,
  requireRole(["user"]),
  validate(bookingIdParamSchema, "params"),
  async (req: any, res, next) => {
    try {
      // 1) Calculate deposit (status + ownership checks happen here)
      const payload = await svc.calculateDepositForBooking(req.params.id, req.user.id);

      // 2) Create Stripe PaymentIntent for booking deposit (separate from orders)
      const pi = await paymentService.initiateBookingDeposit({
        bookingId: req.params.id,
        amount: payload.amount,
        currency: payload.currency,
      });

      res.json({ success: true, data: pi });
    } catch (e) {
      next(e);
    }
  }
);

export default router;