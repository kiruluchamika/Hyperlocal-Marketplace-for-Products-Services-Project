import mongoose from "mongoose";
import ContactMessage, { ContactMessageStatus } from "../models/ContactMessage";
import User from "../models/User";
import { AppError } from "../utils/AppError";
import { createAdminBroadcast, createUserNotification } from "./notificationService";
import { NotificationType } from "../models/Notification";
import { sendEmail } from "./emailNotifications";

interface CreateContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  subject: string;
  message: string;
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const ensureValidId = (id: string, fieldName: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
};

export const createContactMessage = async (
  payload: CreateContactPayload,
  senderUserId?: string
) => {
  let senderName = payload.name?.trim();
  let senderEmail = payload.email?.trim().toLowerCase();
  let senderPhone = payload.phone?.trim();

  if (senderUserId) {
    const user = await User.findById(senderUserId).select("name email phone");
    if (!user) {
      throw new AppError("Authenticated user not found", 404);
    }

    senderName = senderName || user.name;
    senderEmail = senderEmail || user.email;
    senderPhone = senderPhone || user.phone;
  }

  if (!senderName || !senderEmail) {
    throw new AppError("Name and email are required", 400);
  }

  const contactMessage = await ContactMessage.create({
    senderUserId,
    senderName,
    senderEmail,
    senderPhone,
    senderWhatsapp: payload.whatsappNumber?.trim(),
    subject: payload.subject.trim(),
    message: payload.message.trim(),
    status: ContactMessageStatus.PENDING
  });

  await createAdminBroadcast({
    title: "New Contact Request",
    message: `${senderName} sent a new contact request: ${payload.subject.trim()}`,
    type: NotificationType.SYSTEM,
    entityType: "ContactMessage",
    entityId: contactMessage._id
  });

  return {
    message: "Contact request submitted successfully",
    contact: contactMessage
  };
};

export const listMyContactMessages = async (
  userId: string,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;

  const query = {
    senderUserId: new mongoose.Types.ObjectId(userId),
    isDeleted: false
  };

  const [messages, total] = await Promise.all([
    ContactMessage.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ContactMessage.countDocuments(query)
  ]);

  return {
    messages,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const listAdminContactMessages = async (query: {
  page?: number;
  limit?: number;
  status?: ContactMessageStatus;
  search?: string;
}) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = { isDeleted: false };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search) {
    filter.$or = [
      { senderName: { $regex: query.search, $options: "i" } },
      { senderEmail: { $regex: query.search, $options: "i" } },
      { subject: { $regex: query.search, $options: "i" } }
    ];
  }

  const [messages, total] = await Promise.all([
    ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderUserId", "name email")
      .populate("reviewedBy", "name email")
      .populate("adminRepliedBy", "name email"),
    ContactMessage.countDocuments(filter)
  ]);

  return {
    messages,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const markContactAsReviewed = async (contactId: string, adminId: string) => {
  ensureValidId(contactId, "contact id");

  const contact = await ContactMessage.findOne({ _id: contactId, isDeleted: false });

  if (!contact) {
    throw new AppError("Contact message not found", 404);
  }

  if (contact.status === ContactMessageStatus.REPLIED) {
    throw new AppError("Cannot mark a replied message as reviewed-no-reply", 400);
  }

  contact.status = ContactMessageStatus.REVIEWED_NO_REPLY;
  contact.reviewedBy = new mongoose.Types.ObjectId(adminId);
  contact.reviewedAt = new Date();

  await contact.save();

  return contact;
};

export const replyToContactMessage = async (
  contactId: string,
  adminId: string,
  replyMessage: string
) => {
  ensureValidId(contactId, "contact id");

  const contact = await ContactMessage.findOne({ _id: contactId, isDeleted: false });

  if (!contact) {
    throw new AppError("Contact message not found", 404);
  }

  const cleanReply = replyMessage.trim();

  contact.status = ContactMessageStatus.REPLIED;
  contact.adminReplyMessage = cleanReply;
  contact.adminRepliedBy = new mongoose.Types.ObjectId(adminId);
  contact.repliedAt = new Date();
  contact.reviewedBy = contact.reviewedBy || new mongoose.Types.ObjectId(adminId);
  contact.reviewedAt = contact.reviewedAt || new Date();

  await contact.save();

  if (contact.senderUserId) {
    await createUserNotification(contact.senderUserId.toString(), {
      title: "Response to your contact request",
      message: "An admin replied to your message. Please check your email.",
      type: NotificationType.SYSTEM,
      entityType: "ContactMessage",
      entityId: contact._id
    });
  }

  const html = `<p>Hello ${escapeHtml(contact.senderName)},</p>
<p>We reviewed your request and sent a response below.</p>
<p><b>Subject:</b> ${escapeHtml(contact.subject)}</p>
<p><b>Your message:</b><br/>${escapeHtml(contact.message).replace(/\n/g, "<br/>")}</p>
<p><b>Admin reply:</b><br/>${escapeHtml(cleanReply).replace(/\n/g, "<br/>")}</p>
<p>For urgent follow-up, you can continue via your provided WhatsApp or phone contact.</p>`;

  await sendEmail(contact.senderEmail, "Reply to your contact request", html);

  return contact;
};
