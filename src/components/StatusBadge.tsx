import React from "react";

export type StatusType =
  | "High Risk"
  | "Watch / Moderate"
  | "Normal"
  | "Pending Acceptance"
  | "Accepted"
  | "Completed"
  | "Overdue"
  | "In Stock"
  | "Available"
  | "Limited";

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";

  switch (status) {
    case "High Risk":
    case "Overdue":
      badgeStyle = "bg-rose-50 text-rose-800 border-rose-200 font-bold";
      break;
    case "Watch / Moderate":
    case "Pending Acceptance":
    case "Limited":
      badgeStyle = "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
      break;
    case "Normal":
    case "Accepted":
    case "Completed":
    case "In Stock":
    case "Available":
      badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border ${badgeStyle} ${className}`}
    >
      {status}
    </span>
  );
}
