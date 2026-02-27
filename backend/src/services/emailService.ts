/**
 * Email Service using SMTP (Nodemailer)
 * 
 * Handles email sending for OTP delivery and notifications
 * Supports Gmail, Outlook, or any SMTP server
 */

import nodemailer from "nodemailer";
import { env } from "../config/env";

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;
  private fromName: string;
  
  constructor() {
    this.fromEmail = env.SMTP_FROM_EMAIL;
    this.fromName = env.SMTP_FROM_NAME;
    
    // Initialize SMTP transporter if credentials are provided
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      });
      
      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error("❌ SMTP connection error:", error.message);
        } else {
          console.log("✅ SMTP server ready to send emails");
        }
      });
    } else {
      console.warn("⚠️ SMTP not configured. Emails will be logged to console only.");
    }
  }
  
  /**
   * Send OTP to buyer's email
   */
  async sendOTP(
    toEmail: string, 
    buyerName: string, 
    otp: string, 
    orderTitle: string
  ): Promise<{ success: boolean; message?: string }> {
    if (!this.transporter) {
      console.warn("⚠️ SMTP not configured. OTP not sent via email.");
      console.log(`\n📧 [DEV MODE] OTP Email Details:`);
      console.log(`   To: ${toEmail}`);
      console.log(`   Buyer: ${buyerName}`);
      console.log(`   OTP: ${otp}`);
      console.log(`   Order: ${orderTitle}\n`);
      return { success: false, message: "SMTP not configured - OTP logged to console" };
    }
    
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: toEmail,
        subject: `Your Order Delivery OTP - ${orderTitle}`,
        html: this.getOTPEmailTemplate(buyerName, otp, orderTitle),
        text: this.getOTPEmailText(buyerName, otp, orderTitle)
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log("✅ OTP email sent successfully:", info.messageId);
      return { success: true, message: info.messageId };
      
    } catch (error: any) {
      console.error("❌ Failed to send OTP email:", error.message);
      // Fallback: Log OTP to console
      console.log(`\n📧 [FALLBACK] OTP for ${toEmail}: ${otp}\n`);
      return { success: false, message: error.message };
    }
  }
  
  /**
   * HTML Email Template for OTP
   */
  private getOTPEmailTemplate(buyerName: string, otp: string, orderTitle: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Delivery OTP</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <!-- Main Container -->
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                      🛍️ Hyperlocal Marketplace
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">
                      🔐 Your Delivery OTP
                    </h2>
                    
                    <p style="margin: 0 0 15px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                      Hi <strong style="color: #667eea;">${buyerName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 25px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                      Your order for <strong>"${orderTitle}"</strong> has been accepted by the seller! 
                      Use this One-Time Password to confirm delivery:
                    </p>
                    
                    <!-- OTP Box -->
                    <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border: 3px solid #667eea; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                      <div style="font-size: 42px; font-weight: bold; color: #667eea; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">
                        ${otp}
                      </div>
                      <p style="margin: 15px 0 0 0; color: #666666; font-size: 13px;">
                        Valid for ${env.OTP_EXPIRY_MINUTES} minutes
                      </p>
                    </div>
                    
                    <!-- Warning Box -->
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                        <strong>⚠️ Security Notice:</strong><br>
                        • Only share this OTP with the seller at delivery time<br>
                        • Never share OTP via phone or messaging apps<br>
                        • Report suspicious activity immediately
                      </p>
                    </div>
                    
                    <div style="background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #0d47a1; font-size: 14px; line-height: 1.6;">
                        <strong>📋 Next Steps:</strong><br>
                        1. Wait for seller to deliver your item<br>
                        2. Inspect the item carefully<br>
                        3. Share this OTP with seller to complete delivery<br>
                        4. Payment will be released to seller automatically
                      </p>
                    </div>
                    
                    <p style="margin: 25px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      If you didn't place this order, please contact support immediately.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0 0 10px 0; color: #999999; font-size: 13px; line-height: 1.5;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © ${new Date().getFullYear()} Hyperlocal Marketplace. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
  
  /**
   * Plain Text Email Template for OTP (fallback)
   */
  private getOTPEmailText(buyerName: string, otp: string, orderTitle: string): string {
    return `
Hyperlocal Marketplace - Delivery OTP

Hi ${buyerName},

Your order for "${orderTitle}" has been accepted!

Your One-Time Password (OTP): ${otp}

This OTP is valid for ${env.OTP_EXPIRY_MINUTES} minutes.

IMPORTANT:
- Only share this OTP with the seller at delivery time
- Never share OTP via phone or messaging apps
- Report suspicious activity immediately

Next Steps:
1. Wait for seller to deliver your item
2. Inspect the item carefully
3. Share this OTP with seller to complete delivery
4. Payment will be released to seller automatically

If you didn't place this order, please contact support immediately.

---
This is an automated message. Please do not reply.
© ${new Date().getFullYear()} Hyperlocal Marketplace
    `;
  }
  
  /**
   * Send Order Confirmation Email
   */
  async sendOrderConfirmation(
    toEmail: string,
    orderDetails: {
      orderId: string;
      title: string;
      total: number;
      currency: string;
    }
  ): Promise<{ success: boolean; message?: string }> {
    if (!this.transporter) {
      console.log(`📧 [DEV MODE] Order confirmation for ${toEmail}: Order #${orderDetails.orderId}`);
      return { success: false, message: "SMTP not configured" };
    }
    
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: toEmail,
        subject: `Order Confirmed - ${orderDetails.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #667eea;">Order Confirmed! ✅</h2>
            <p>Your order has been placed successfully.</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
              <p><strong>Item:</strong> ${orderDetails.title}</p>
              <p><strong>Total:</strong> ${orderDetails.currency} ${orderDetails.total.toLocaleString()}</p>
            </div>
            <p>You will receive updates about your order via email.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              © ${new Date().getFullYear()} Hyperlocal Marketplace
            </p>
          </div>
        `,
        text: `Order Confirmed!\n\nOrder ID: ${orderDetails.orderId}\nItem: ${orderDetails.title}\nTotal: ${orderDetails.currency} ${orderDetails.total}\n\nYou will receive updates about your order via email.`
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Order confirmation sent:", info.messageId);
      return { success: true, message: info.messageId };
      
    } catch (error: any) {
      console.error("❌ Failed to send order confirmation:", error.message);
      return { success: false, message: error.message };
    }
  }
}
