import { Router } from "express";
import { validate } from "../middlewares/validate";
import { sendOtpCode, verifyOtpCode } from "../controllers/otpController";
import { sendOtpSchema, verifyOtpSchema } from "../validators/otpSchemas";

const router = Router();

/**
 * @openapi
 * /otp/send:
 *   post:
 *     tags: [OTP]
 *     summary: Send OTP to a phone number via Twilio Verify
 *     description: Sends a one-time password to the given phone number. Uses Twilio Verify service.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number in E.164 format
 *                 example: "+94771234567"
 *               channel:
 *                 type: string
 *                 enum: [sms, whatsapp]
 *                 default: sms
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sid:
 *                   type: string
 *                 to:
 *                   type: string
 *                 channel:
 *                   type: string
 *                 status:
 *                   type: string
 *                 valid:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or Twilio request error
 *       500:
 *         description: Twilio OTP is not configured
 */
router.post("/send", validate(sendOtpSchema), sendOtpCode);

/**
 * @openapi
 * /otp/verify:
 *   post:
 *     tags: [OTP]
 *     summary: Verify OTP code for a phone number
 *     description: Verifies the OTP code sent to the phone number via Twilio Verify.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code]
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number in E.164 format
 *                 example: "+94771234567"
 *               code:
 *                 type: string
 *                 description: OTP code received by user
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sid:
 *                   type: string
 *                 to:
 *                   type: string
 *                 status:
 *                   type: string
 *                 valid:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid or expired OTP
 *       500:
 *         description: Twilio OTP is not configured
 */
router.post("/verify", validate(verifyOtpSchema), verifyOtpCode);

export default router;
