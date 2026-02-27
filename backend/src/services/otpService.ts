import twilio from "twilio";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

interface SendOtpInput {
  phone: string;
  channel: "sms" | "whatsapp";
}

interface VerifyOtpInput {
  phone: string;
  code: string;
}

const getVerifyConfig = () => {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_VERIFY_SERVICE_SID) {
    throw new AppError(
      "Twilio OTP is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID",
      500
    );
  }

  return {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    verifyServiceSid: env.TWILIO_VERIFY_SERVICE_SID
  };
};

const createClient = () => {
  const { accountSid, authToken } = getVerifyConfig();
  return twilio(accountSid, authToken);
};

const mapTwilioError = (error: unknown) => {
  const twilioError = error as { message?: string; status?: number };

  if (twilioError?.status && twilioError.status >= 400 && twilioError.status < 500) {
    throw new AppError(twilioError.message || "Twilio request failed", 400);
  }

  throw new AppError("Failed to communicate with OTP provider", 502);
};

export const sendOtp = async (input: SendOtpInput) => {
  try {
    const { verifyServiceSid } = getVerifyConfig();
    const client = createClient();

    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: input.phone,
        channel: input.channel
      });

    return {
      sid: verification.sid,
      to: verification.to,
      channel: verification.channel,
      status: verification.status,
      valid: false,
      message: "OTP sent successfully"
    };
  } catch (error) {
    mapTwilioError(error);
  }
};

export const verifyOtp = async (input: VerifyOtpInput) => {
  try {
    const { verifyServiceSid } = getVerifyConfig();
    const client = createClient();

    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: input.phone,
        code: input.code
      });

    if (check.status !== "approved") {
      throw new AppError("Invalid or expired OTP", 400);
    }

    return {
      sid: check.sid,
      to: check.to,
      status: check.status,
      valid: check.valid,
      message: "OTP verified successfully"
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    mapTwilioError(error);
  }
};
