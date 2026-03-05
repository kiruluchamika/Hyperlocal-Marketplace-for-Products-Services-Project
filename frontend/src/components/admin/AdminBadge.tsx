import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

interface AdminBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const variantMap: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  neutral: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  purple: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
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
    REMOVED: 'danger',
    SOLD: 'purple',
    HIDDEN: 'neutral',
  };
  return map[status] || 'neutral';
};
