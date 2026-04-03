export type ContactMessageStatus = "PENDING" | "REVIEWED_NO_REPLY" | "REPLIED";

export interface ContactSubmitPayload {
  name?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  subject: string;
  message: string;
}

export interface ContactMessage {
  _id: string;
  senderUserId?: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  senderWhatsapp?: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  adminReplyMessage?: string;
  reviewedAt?: string;
  repliedAt?: string;
  createdAt: string;
  updatedAt: string;
}
