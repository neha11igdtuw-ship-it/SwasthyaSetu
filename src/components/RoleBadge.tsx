import React from "react";

export type RoleType = "Patient" | "Health Worker" | "Doctor" | "Healthcare Facility";

interface RoleBadgeProps {
  role: RoleType;
  className?: string;
}

export function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  const roleStyles: Record<RoleType, string> = {
    Patient: "bg-emerald-50 text-emerald-800 border-emerald-200",
    "Health Worker": "bg-teal-50 text-teal-800 border-teal-200",
    Doctor: "bg-sky-50 text-sky-800 border-sky-200",
    "Healthcare Facility": "bg-indigo-50 text-indigo-800 border-indigo-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleStyles[role]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {role}
    </span>
  );
}
