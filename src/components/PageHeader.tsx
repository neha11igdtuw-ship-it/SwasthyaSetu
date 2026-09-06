import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  roleBadge?: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  roleBadge,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h1>
          {roleBadge}
        </div>
        {subtitle && (
          <p className="text-slate-600 text-sm leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
