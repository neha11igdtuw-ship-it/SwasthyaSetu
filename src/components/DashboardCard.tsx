import React from "react";

interface DashboardCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  icon?: React.ElementType;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  highlight?: boolean;
}

export function DashboardCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  children,
  className = "",
  highlight = false,
}: DashboardCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition-all ${
        highlight
          ? "border-teal-500/80 ring-1 ring-teal-500/20"
          : "border-slate-200/80 hover:border-slate-300"
      } ${className}`}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
          )}
        </div>

        {value !== undefined && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {value}
            </span>
            {badge}
          </div>
        )}

        {subtitle && (
          <p className="text-xs text-slate-600 leading-relaxed">{subtitle}</p>
        )}
      </div>

      {children && <div className="mt-4 pt-3 border-t border-slate-100">{children}</div>}
    </div>
  );
}
