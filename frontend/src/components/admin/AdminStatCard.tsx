import React from 'react';
import { FiArrowDownRight, FiArrowUpRight } from 'react-icons/fi';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan';
}

const colorMap = {
  blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
  emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
  amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
  rose: 'from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400',
  violet: 'from-violet-500/20 to-violet-600/5 border-violet-500/30 text-violet-400',
  cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
};

const iconBgMap = {
  blue: 'bg-blue-500/20 text-blue-400',
  emerald: 'bg-emerald-500/20 text-emerald-400',
  amber: 'bg-amber-500/20 text-amber-400',
  rose: 'bg-rose-500/20 text-rose-400',
  violet: 'bg-violet-500/20 text-violet-400',
  cyan: 'bg-cyan-500/20 text-cyan-400',
};

const AdminStatCard: React.FC<AdminStatCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'blue',
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-200/50 ${colorMap[color]}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {trend && (
            <div className="flex items-center gap-2 pt-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                  trend.value >= 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                {trend.value >= 0 ? <FiArrowUpRight size={12} /> : <FiArrowDownRight size={12} />}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`rounded-xl p-3 ${iconBgMap[color]}`}>{icon}</div>
      </div>
      <div
        className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20 blur-2xl ${
          color === 'blue'
            ? 'bg-blue-500'
            : color === 'emerald'
            ? 'bg-emerald-500'
            : color === 'amber'
            ? 'bg-amber-500'
            : color === 'rose'
            ? 'bg-rose-500'
            : color === 'violet'
            ? 'bg-violet-500'
            : 'bg-cyan-500'
        }`}
      />
    </div>
  );
};

export default AdminStatCard;
