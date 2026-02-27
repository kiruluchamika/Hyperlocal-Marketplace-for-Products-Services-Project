export type NotificationType = 'ORDER' | 'PAYMENT' | 'LISTING' | 'USER' | 'CATEGORY' | 'SYSTEM';
export type RecipientType = 'USER' | 'ADMIN_BROADCAST';

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
