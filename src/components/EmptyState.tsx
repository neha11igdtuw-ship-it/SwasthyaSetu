import React from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  return (
    <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100 flex items-center justify-center text-teal-700 mb-3 shadow-xs">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="px-3.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && (
            <button
              type="button"
              onClick={onSecondary}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
