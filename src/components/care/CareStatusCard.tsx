import React from "react";
import { Activity, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import { useLanguage } from "@/lib/i18n/languageContext";

interface CareStatusCardProps {
  label?: string;
  riskStatus: "High Risk" | "Watch / Moderate" | "Low Risk";
  reasons: string[];
  disclaimer: string;
}

export function CareStatusCard({
  riskStatus,
  reasons,
  disclaimer,
}: CareStatusCardProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-teal-700" />
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {t("carePriority")}
            </span>
            <h3 className="font-bold text-slate-900 text-base">{t("initialHealthCheck")}</h3>
          </div>
        </div>
        <StatusBadge status={riskStatus} />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-700 block">
          {t("reasonsForCarePriority")}
        </span>
        <ul className="space-y-1.5 text-xs text-slate-600">
          {reasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <DisclaimerCard text={disclaimer} />
    </div>
  );
}
