import React from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  actionLabel?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && (
        <button
          type="button"
          className="px-3.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
