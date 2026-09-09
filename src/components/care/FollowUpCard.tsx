import React from "react";
import { FollowUpItem } from "@/lib/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

interface FollowUpCardProps {
  item: FollowUpItem;
  onMarkCompleted?: (id: string) => void;
}

export function FollowUpCard({ item, onMarkCompleted }: FollowUpCardProps) {
  const { t } = useLanguage();
  const isCompleted = item.status === "Completed";

  const displayTitle =
    item.title.includes("District Hospital") || item.title.includes("BP")
      ? t("preEclampsiaReason")
      : t(item.title);

  const displayInstructions =
    item.instructions.includes("District Hospital") || item.instructions.includes("specialist")
      ? t("visitDistrictHospitalText")
      : t(item.instructions);

  const displayDueDate =
    item.dueDate.includes("12 Sep") || item.dueDate.includes("September")
      ? t("followUpDueSep12")
      : t(item.dueDate);

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isCompleted
          ? "bg-slate-50/80 border-slate-200 text-slate-600"
          : "bg-white border-slate-200/90 hover:border-teal-400 shadow-xs"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-teal-50 border border-teal-100 text-teal-700">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {item.type}
            </span>
            <h4 className="font-extrabold text-slate-900 text-sm">{displayTitle}</h4>
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        {displayInstructions}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Clock className="w-3.5 h-3.5 text-teal-700" />
          <span>{t("nextFollowUp")}: <strong>{displayDueDate}</strong></span>
        </div>

        {!isCompleted && (
          <button
            type="button"
            onClick={() => onMarkCompleted && onMarkCompleted(item.id)}
            className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t("markCompleted")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
