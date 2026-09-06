import React from "react";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

interface DisclaimerCardProps {
  text?: string;
  variant?: "info" | "amber" | "rose";
}

export function DisclaimerCard({
  text,
  variant = "amber",
}: DisclaimerCardProps) {
  const { t } = useLanguage();

  const displayText = text || t("aiPreliminaryNotice");

  let styles = "bg-amber-50/80 border-amber-200/90 text-amber-950";
  let iconColor = "text-amber-600";

  if (variant === "info") {
    styles = "bg-teal-50/80 border-teal-200/90 text-teal-950";
    iconColor = "text-teal-600";
  } else if (variant === "rose") {
    styles = "bg-rose-50/80 border-rose-200/90 text-rose-950";
    iconColor = "text-rose-600";
  }

  return (
    <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-start gap-3 shadow-2xs ${styles}`}>
      <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
      <div className="space-y-0.5">
        <span className="font-extrabold uppercase text-[10px] tracking-wider block opacity-75">
          {t("importantSafetyNotice")}
        </span>
        <p className="leading-relaxed font-medium">{displayText}</p>
      </div>
    </div>
  );
}
