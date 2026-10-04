import React from "react";
import type { SupportRequestStatus } from "@/lib/api/types";

const STATUS_STYLES: Record<SupportRequestStatus, string> = {
  SUBMITTED: "bg-slate-100 text-slate-700 border-slate-300",
  ASSIGNED: "bg-blue-100 text-blue-800 border-blue-300",
  CALLBACK_PENDING: "bg-amber-100 text-amber-800 border-amber-300",
  CONTACTED: "bg-indigo-100 text-indigo-800 border-indigo-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const STATUS_LABELS: Record<SupportRequestStatus, string> = {
  SUBMITTED: "Submitted",
  ASSIGNED: "Assigned",
  CALLBACK_PENDING: "Callback pending",
  CONTACTED: "Contacted",
  RESOLVED: "Resolved",
};

export function SupportRequestStatusBadge({ status }: { status: SupportRequestStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
