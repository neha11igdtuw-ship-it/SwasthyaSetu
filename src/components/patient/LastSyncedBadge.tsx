import React from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";

interface LastSyncedBadgeProps {
  lastSyncedText: string;
}

export function LastSyncedBadge({ lastSyncedText }: LastSyncedBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
      <WifiOff className="w-3.5 h-3.5 text-emerald-700" />
      <span className="font-bold">Saved on this device</span>
      <span className="text-emerald-700">•</span>
      <span className="text-slate-600 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        {lastSyncedText}
      </span>
    </div>
  );
}
