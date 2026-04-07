import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

interface AdminBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const variantMap: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  danger: 'bg-rose-100 text-rose-700 border-rose-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  purple: 'bg-violet-100 text-violet-700 border-violet-200',
};

const AdminBadge: React.FC<AdminBadgeProps> = ({ children, variant = 'neutral' }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantMap[variant]}`}
    >
      {children}
    </span>
  );
};

export default AdminBadge;

/* Helper to map common status strings to badge variants */
export const getStatusVariant = (status: string): BadgeVariant => {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: 'success',
    COMPLETED: 'success',
    RELEASED: 'success',
    CONFIRMED: 'success',
    VERIFIED: 'success',
    PROVIDER_ACCEPTED: 'info',
    ACCEPTED: 'info',
    HELD: 'info',
    IN_PROGRESS: 'info',
    PENDING: 'warning',
    INITIATED: 'warning',
    UNSUBMITTED: 'neutral',
    REJECTED: 'danger',
    CANCELLED: 'danger',
    FAILED: 'danger',
    DELETED: 'danger',
    SUSPENDED: 'danger',
    REMOVED: 'warning',
    UNDER_REVIEW: 'warning',
    SOLD: 'purple',
    HIDDEN: 'neutral',
  };
  return map[status] || 'neutral';
};
