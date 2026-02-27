import mongoose from "mongoose";
import ServiceSelling from "../models/ServiceSelling";
import ServiceBooking from "../models/ServiceBooking";
import { AppError } from "../utils/AppError";

import {
  notifyBookingCreated,
  notifyBookingDecision,
  notifyBookingConfirmed,
} from "./emailNotifications";

function addMinutes(date: Date, mins: number) {
  return new Date(date.getTime() + mins * 60 * 1000);
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
  return ServiceBooking.find(query).sort({ createdAt: -1 });
}

export async function listProviderBookings(providerId: string, status?: string) {
  const query: any = { providerId: new mongoose.Types.ObjectId(providerId) };
  if (status) query.status = status;
  return ServiceBooking.find(query).sort({ startAt: 1 });
}

export async function cancelBooking(id: string, buyerId: string) {
  const booking = await ServiceBooking.findById(id);
  if (!booking) throw new AppError("Booking not found", 404);

  if (String(booking.buyerId) !== String(buyerId)) {
    throw new AppError("Forbidden", 403);
  }

  if (booking.status !== "PENDING") {
    throw new AppError("Only PENDING bookings can be cancelled", 400);
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
  const q: any = {
    serviceId: new mongoose.Types.ObjectId(query.serviceId),
    status: "CONFIRMED",
  };

  if (query.from || query.to) {
    q.startAt = {};
    if (query.from) q.startAt.$gte = new Date(query.from);
    if (query.to) q.startAt.$lte = new Date(query.to);
  }

  return ServiceBooking.find(q).select("startAt endAt -_id");
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

  return {
    amount: depositAmount,
    currency: "lkr",
    metadata: {
      paymentPurpose: "BOOKING_DEPOSIT",
      bookingId: String(booking._id),
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