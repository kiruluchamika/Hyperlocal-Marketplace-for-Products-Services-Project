import mongoose from "mongoose";
import ServiceSelling from "../models/ServiceSelling";
import ServiceBooking from "../models/ServiceBooking";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";
import { StripeConnectService } from "./stripeConnectService";

import { NotificationType } from "../models/Notification";
import { createUserNotification } from "./notificationService";
import {
  notifyBookingUnavailable,
  notifyBookingCreated,
  notifyBookingDecision,
  notifyBookingConfirmed,
} from "./emailNotifications";

function addMinutes(date: Date, mins: number) {
  return new Date(date.getTime() + mins * 60 * 1000);
}

const stripeConnectService = new StripeConnectService();
const stripePaymentCurrency = env.STRIPE_PAYMENT_CURRENCY.toLowerCase();

const convertLkrToStripeAmount = (amountLkr: number) => {
  if (stripePaymentCurrency === "usd") {
    return Math.round((amountLkr / env.STRIPE_BALANCE_TO_LKR_RATE) * 100) / 100;
  }

  return amountLkr;
};

const isStripeConnectDisabledError = (error: any) =>
  String(error?.message || error?.raw?.message || "").includes("Stripe Connect payouts are disabled");

export async function populateIsSlotTaken(bookings: any[]) {
  if (!bookings || !bookings.length) return bookings;

  const candidates = bookings.filter((b) => ["PENDING", "PROVIDER_ACCEPTED"].includes(b.status));
  if (!candidates.length) return bookings;

  const serviceIds = [...new Set(candidates.map((b) => String(b.serviceId?._id || b.serviceId)))];

  const confirmed = await ServiceBooking.find({
    serviceId: { $in: serviceIds },
    status: "CONFIRMED",
    endAt: { $gte: new Date() },
  }).select("serviceId startAt endAt");

  for (const booking of bookings) {
    if (!["PENDING", "PROVIDER_ACCEPTED"].includes(booking.status)) continue;

    const sId = String(booking.serviceId?._id || booking.serviceId);
    const hasOverlap = confirmed.some(
      (c) => String(c.serviceId) === sId && overlaps(booking.startAt, booking.endAt, c.startAt, c.endAt)
    );

    if (hasOverlap) {
      booking.isSlotTaken = true;
    }
  }

  return bookings;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export async function createBooking(buyerId: string, body: any) {
  const service = await ServiceSelling.findById(body.serviceId);
  if (!service || service.status !== "ACTIVE") {
    throw new AppError("Service not found or not active", 404);
  }

  const startAt = new Date(body.startAt);
  const durationMinutes = Number(body.durationMinutes);
  const endAt = addMinutes(startAt, durationMinutes);

  const created = await ServiceBooking.create({
    serviceId: service._id,
    buyerId: new mongoose.Types.ObjectId(buyerId),
    providerId: service.sellerId,
    startAt,
    endAt,
    durationMinutes,
    note: body.note,
    status: "PENDING",
  });

  // ✅ Email provider: booking request created (non-blocking)
  void notifyBookingCreated({
    bookingId: String(created._id),
    providerId: String(service.sellerId),
    startAt: created.startAt,
    endAt: created.endAt,
  }).catch(() => {});

  return created;
}

export async function listMyBookings(buyerId: string, status?: string) {
  const query: any = { buyerId: new mongoose.Types.ObjectId(buyerId) };
  if (status) query.status = status;
  let bookings = await ServiceBooking.find(query)
    .populate({
      path: "serviceId",
      select: "title locationText location price pricingType images status isActive sellerId",
    })
    .populate({
      path: "providerId",
      select: "name email profileImage",
    })
    .sort({ createdAt: -1 })
    .lean();

  bookings = await populateIsSlotTaken(bookings);
  return bookings;
}

export async function listProviderBookings(providerId: string, status?: string) {
  const query: any = { providerId: new mongoose.Types.ObjectId(providerId) };
  if (status) query.status = status;
  let bookings = await ServiceBooking.find(query)
    .populate({
      path: "serviceId",
      select: "title locationText location price pricingType images status isActive sellerId",
    })
    .populate({
      path: "buyerId",
      select: "name email profileImage",
    })
    .sort({ startAt: 1 })
    .lean();

  bookings = await populateIsSlotTaken(bookings);
  return bookings;
}

export async function cancelBooking(id: string, buyerId: string) {
  const booking = await ServiceBooking.findById(id);
  if (!booking) throw new AppError("Booking not found", 404);

  if (String(booking.buyerId) !== String(buyerId)) {
    throw new AppError("Forbidden", 403);
  }

  const cancellableStatuses = ["PENDING", "PROVIDER_ACCEPTED"];

  if (!cancellableStatuses.includes(booking.status)) {
    throw new AppError("Only pending or accepted unpaid bookings can be cancelled", 400);
  }

  if (booking.deposit?.paidAt) {
    throw new AppError("Confirmed bookings cannot be cancelled from this page", 400);
  }

  booking.status = "CANCELLED";
  await booking.save();
  return booking;
}

export async function providerDecision(
  id: string,
  providerId: string,
  action: "ACCEPT" | "REJECT"
) {
  const booking = await ServiceBooking.findById(id);
  if (!booking) throw new AppError("Booking not found", 404);

  if (String(booking.providerId) !== String(providerId)) {
    throw new AppError("Forbidden", 403);
  }

  if (booking.status !== "PENDING") {
    throw new AppError("Only PENDING bookings can be decided", 400);
  }

  booking.status = action === "ACCEPT" ? "PROVIDER_ACCEPTED" : "REJECTED";
  await booking.save();

  // ✅ Email buyer: provider accepted/rejected (non-blocking)
  void notifyBookingDecision({
    bookingId: String(booking._id),
    buyerId: String(booking.buyerId),
    action,
    startAt: booking.startAt,
    endAt: booking.endAt,
  }).catch(() => {});

  return booking;
}

export async function getConfirmedSlots(query: any) {
  const conditions: any[] = [
    { serviceId: new mongoose.Types.ObjectId(query.serviceId) },
    { status: "CONFIRMED" },
  ];

  // Include overlapping slots so currently active confirmed bookings are visible too.
  const now = new Date();
  const fromDate = query.from ? new Date(query.from) : now;
  conditions.push({ endAt: { $gte: fromDate > now ? fromDate : now } });

  if (query.to) {
    conditions.push({ startAt: { $lte: new Date(query.to) } });
  }

  return ServiceBooking.find({ $and: conditions })
    .sort({ startAt: 1 })
    .select("startAt endAt -_id");
}

export async function calculateDepositForBooking(bookingId: string, buyerId: string) {
  const booking = await ServiceBooking.findById(bookingId);
  if (!booking) throw new AppError("Booking not found", 404);

  if (String(booking.buyerId) !== String(buyerId)) {
    throw new AppError("Forbidden", 403);
  }

  if (booking.status !== "PROVIDER_ACCEPTED") {
    throw new AppError("Deposit allowed only after provider accepts", 400);
  }

  const service = await ServiceSelling.findById(booking.serviceId);
  if (!service) throw new AppError("Service not found", 404);

  const depositAmount =
    service.pricingType === "HOURLY" ? service.price : Math.round(service.price * 0.2);

  const stripeAmount = convertLkrToStripeAmount(Number(depositAmount || 0));

  return {
    amount: stripeAmount,
    currency: stripePaymentCurrency,
    metadata: {
      paymentPurpose: "BOOKING_DEPOSIT",
      bookingId: String(booking._id),
      displayAmountLkr: String(depositAmount),
    },
  };
}

export async function confirmBookingFromStripeSuccess(params: {
  bookingId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}) {
  const booking = await ServiceBooking.findById(params.bookingId);
  if (!booking) throw new AppError("Booking not found", 404);

  if (booking.status === "CONFIRMED") return booking;

  if (booking.status !== "PROVIDER_ACCEPTED") {
    throw new AppError("Cannot confirm booking from current status", 400);
  }

  const confirmed = await ServiceBooking.find({
    serviceId: booking.serviceId,
    status: "CONFIRMED",
  }).select("startAt endAt");

  const conflict = confirmed.some((b) =>
    overlaps(booking.startAt, booking.endAt, b.startAt, b.endAt)
  );

  if (conflict) throw new AppError("Slot already booked", 409);

  booking.status = "CONFIRMED";
  booking.deposit = {
    amount: params.amount,
    currency: params.currency,
    stripePaymentIntentId: params.paymentIntentId,
    paidAt: new Date(),
  };

  await booking.save();

  if (!booking.deposit?.stripeTransferId) {
    const grossAmount = Number(booking.deposit?.amount || 0);
    const feePercent = env.STRIPE_TRANSFER_FEE_PERCENT;
    const feeAmount = Math.round(grossAmount * (feePercent / 100) * 100) / 100;
    const netAmount = Math.max(0, grossAmount - feeAmount);

    booking.deposit = {
      amount: booking.deposit.amount,
      currency: booking.deposit.currency,
      stripePaymentIntentId: booking.deposit.stripePaymentIntentId,
      paidAt: booking.deposit.paidAt,
      payoutGrossAmount: grossAmount,
      payoutFeePercent: feePercent,
      payoutFeeAmount: feeAmount,
      payoutNetAmount: netAmount,
      payoutAttemptedAt: new Date(),
    };

    if (!stripeConnectService.isEnabled()) {
      booking.deposit = {
        ...booking.deposit,
        payoutStatus: "SKIPPED_NOT_ELIGIBLE",
        payoutError: "Stripe Connect payouts are disabled",
      };

      await booking.save();
      return booking;
    }

    const eligible = await stripeConnectService.isUserEligibleForPayout(String(booking.providerId));
    const sourceTransaction = await stripeConnectService.resolveLatestChargeId(params.paymentIntentId);

    if (eligible && netAmount > 0) {
      try {
        const transfer = await stripeConnectService.createTransferToUser({
          userId: String(booking.providerId),
          amount: netAmount,
          currency: params.currency,
          description: `Service booking ${booking._id.toString()} payout`,
          transferGroup: `BOOKING_${booking._id.toString()}`,
          metadata: {
            bookingId: booking._id.toString(),
            providerId: String(booking.providerId),
            paymentIntentId: params.paymentIntentId,
          },
          idempotencyKey: `booking-payout-${booking._id.toString()}`,
          sourceTransaction,
        });

        booking.deposit = {
          ...booking.deposit,
          stripeTransferId: transfer.id,
          payoutStatus: "TRANSFER_CREATED",
          payoutError: undefined,
        };
      } catch (error: any) {
        const connectDisabled = isStripeConnectDisabledError(error);
        booking.deposit = {
          ...booking.deposit,
          payoutStatus: connectDisabled ? "SKIPPED_NOT_ELIGIBLE" : "TRANSFER_FAILED",
          payoutError: connectDisabled ? undefined : error?.message || "Unknown transfer error",
        };
      }
    } else {
      booking.deposit = {
        ...booking.deposit,
        payoutStatus: "SKIPPED_NOT_ELIGIBLE",
      };
    }

    await booking.save();
  }

  // Find clashing pending/accepted bookings
  const clashingBookings = await ServiceBooking.find({
    serviceId: booking.serviceId,
    _id: { $ne: booking._id },
    status: { $in: ["PENDING", "PROVIDER_ACCEPTED"] }
  }).select("_id buyerId providerId startAt endAt");

  const actualClashes = clashingBookings.filter(b => 
    overlaps(booking.startAt, booking.endAt, b.startAt, b.endAt)
  );

  for (const clash of actualClashes) {
    void notifyBookingUnavailable({
      bookingId: String(clash._id),
      buyerId: String(clash.buyerId),
      providerId: String(clash.providerId),
      startAt: clash.startAt,
      endAt: clash.endAt,
    }).catch(() => {});

    void createUserNotification(clash.buyerId, {
      title: "Booking Slot Taken",
      message: `The slot you requested for booking #${String(clash._id).slice(-6)} has been taken by another user who paid first. Please make another request.`,
      type: NotificationType.ORDER,
      entityType: "ServiceBooking",
      entityId: String(clash._id)
    }).catch(() => {});
  }

  // ✅ Email both: booking confirmed (non-blocking)
  void notifyBookingConfirmed({
    bookingId: String(booking._id),
    buyerId: String(booking.buyerId),
    providerId: String(booking.providerId),
    startAt: booking.startAt,
    endAt: booking.endAt,
  }).catch(() => {});

  return booking;
}
