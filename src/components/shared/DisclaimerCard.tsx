import React from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";

interface DisclaimerCardProps {
  text: string;
  variant?: "amber" | "teal";
}

export function DisclaimerCard({
  text,
  variant = "amber",
}: DisclaimerCardProps) {
  const styles = {
    amber: "bg-amber-50/90 border-amber-200/90 text-amber-950",
    teal: "bg-teal-50/90 border-teal-200/90 text-teal-950",
  };

  const Icon = variant === "amber" ? ShieldAlert : AlertCircle;

  return (
    <div className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 shadow-xs ${styles[variant]}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
      <div>
        <span className="font-bold block mb-0.5 uppercase tracking-wide text-[10px]">
          Important Medical Safety Notice
        </span>
        <p className="font-medium">{text}</p>
      </div>
    </div>
  );
}
