export type NotificationType = 'ORDER' | 'PAYMENT' | 'LISTING' | 'REVIEW' | 'USER' | 'CATEGORY' | 'SYSTEM' | 'REPORT';
export type RecipientType = 'USER' | 'ADMIN_BROADCAST';
export type NotificationView = 'user' | 'admin' | 'all';

export interface INotification {
  _id: string;
  recipientType: RecipientType;
  recipientUserId?: string;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}
