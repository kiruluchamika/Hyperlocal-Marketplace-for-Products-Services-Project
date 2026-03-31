import { Resend } from "resend";
import User from "../models/User";

// Use env vars directly (works with dotenv)
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

// Create client only if key exists
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function getEmail(userId: string): Promise<string> {
  if (!userId) throw new Error("Missing userId for email lookup");

  const user: any = await User.findById(userId).select("email");

  if (!user) {
    throw new Error(`User not found for id=${userId}`);
  }

  if (!user.email) {
    throw new Error(`User email not found for id=${userId}`);
  }

  return String(user.email).trim();
}

export async function sendEmail(to: string, subject: string, html: string) {
  // Don’t break booking if env not configured
  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY not set → skipping email send");
    return;
  }

  console.log("📧 Sending email via Resend:", { to, subject, from: RESEND_FROM_EMAIL });

  const result = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to,
    subject,
    html,
  });

  console.log("✅ Resend response:", result);
}

export async function notifyBookingCreated(data: {
  bookingId: string;
  providerId: string;
  startAt: Date;
  endAt: Date;
}) {
  const providerEmail = await getEmail(data.providerId);

  await sendEmail(
    providerEmail,
    "New Booking Request",
    `<p>You have a new booking request.</p>
     <p><b>Booking:</b> ${data.bookingId}</p>
     <p><b>Start:</b> ${new Date(data.startAt).toISOString()}</p>
     <p><b>End:</b> ${new Date(data.endAt).toISOString()}</p>`
  );
}

export async function notifyBookingDecision(data: {
  bookingId: string;
  buyerId: string;
  action: "ACCEPT" | "REJECT";
  startAt: Date;
  endAt: Date;
}) {
  const buyerEmail = await getEmail(data.buyerId);

  const message =
    data.action === "ACCEPT"
      ? "Your booking was accepted. Please pay the deposit to confirm."
      : "Your booking was rejected.";

  await sendEmail(
    buyerEmail,
    "Booking Update",
    `<p>${message}</p>
     <p><b>Booking:</b> ${data.bookingId}</p>
     <p><b>Start:</b> ${new Date(data.startAt).toISOString()}</p>
     <p><b>End:</b> ${new Date(data.endAt).toISOString()}</p>`
  );
}

export async function notifyBookingConfirmed(data: {
  bookingId: string;
  buyerId: string;
  providerId: string;
  startAt: Date;
  endAt: Date;
}) {
  const buyerEmail = await getEmail(data.buyerId);
  const providerEmail = await getEmail(data.providerId);

  const html = `<p><b>Booking CONFIRMED</b></p>
                <p><b>Booking:</b> ${data.bookingId}</p>
                <p><b>Start:</b> ${new Date(data.startAt).toISOString()}</p>
                <p><b>End:</b> ${new Date(data.endAt).toISOString()}</p>`;

  await Promise.all([
    sendEmail(buyerEmail, "Booking Confirmed", html),
    sendEmail(providerEmail, "Booking Confirmed", html),
  ]);
}