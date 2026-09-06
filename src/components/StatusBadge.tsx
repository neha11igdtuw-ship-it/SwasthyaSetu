import React from "react";
import { useLanguage } from "@/lib/i18n/languageContext";

export type StatusType =
  | "High Risk"
  | "Watch / Moderate"
  | "Normal"
  | "Low Risk"
  | "Waiting for action"
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
  const { t } = useLanguage();

  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";

  switch (status) {
    case "High Risk":
    case "Overdue":
      badgeStyle = "bg-rose-50 text-rose-800 border-rose-200 font-bold";
      break;
    case "Watch / Moderate":
    case "Waiting for action":
    case "Pending Acceptance":
    case "Limited":
      badgeStyle = "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
      break;
    case "Normal":
    case "Low Risk":
    case "Accepted":
    case "Completed":
    case "In Stock":
    case "Available":
      badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold";
      break;
  }

  // Map status key if available in dictionary
  let displayStatus = status;
  if (status === "High Risk") displayStatus = t("highRisk");
  else if (status === "Watch / Moderate") displayStatus = t("mediumRisk");
  else if (status === "Low Risk") displayStatus = t("lowRisk");
  else if (status === "Normal") displayStatus = t("normal");
  else if (status === "Waiting for action" || status === "Pending Acceptance") displayStatus = t("waitingForAction");
  else if (status === "Accepted") displayStatus = t("accepted");
  else if (status === "Completed") displayStatus = t("closed");

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border ${badgeStyle} ${className}`}
    >
      {displayStatus}
    </span>
  );
}
