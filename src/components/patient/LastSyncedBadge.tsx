import React from "react";
import { CheckCircle2 } from "lucide-react";

interface LastSyncedBadgeProps {
  lastSyncedText?: string;
}

export function LastSyncedBadge({ lastSyncedText }: LastSyncedBadgeProps) {
  return (
    <div role="status" className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-100">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{lastSyncedText || ""}</span>
    </div>
  );
}
