"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { hwFollowUpsList, HWFollowUp } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { Clock, CheckCircle2, PhoneCall } from "lucide-react";

export default function HWFollowUpsPage() {
  const { t } = useLanguage();
  const [activeCategory, setActiveTab] = useState<string>("Due Today");
  const [followUps, setFollowUps] = useState<HWFollowUp[]>(hwFollowUpsList);

  const filteredList = followUps.filter((fu) => {
    if (activeCategory === "Due Today") return fu.status === "Due Today";
    if (activeCategory === "Missed") return fu.status === "Missed";
    if (activeCategory === "Upcoming") return fu.status === "Upcoming";
    if (activeCategory === "Completed") return fu.status === "Completed";
    return true;
  });

  const handleMarkCompleted = (id: string) => {
    setFollowUps((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "Completed" } : item
      )
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={t("followUpsTitle")}
        subtitle={t("followUpsSubtitle")}
        roleBadge={<RoleBadge role="Health Worker" />}
      />

      {/* Category Tabs */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex gap-2 text-xs">
          {[
            { id: "Due Today", label: t("dueTodayTab") },
            { id: "Missed", label: t("missedVisitsTab") },
            { id: "Upcoming", label: t("upcomingTab") },
            { id: "Completed", label: t("completedTab") },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              className={`px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${
                activeCategory === cat.id
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Follow-up Items Grid */}
      <div className="space-y-4">
        {filteredList.map((fu) => (
          <div
            key={fu.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {fu.patientName}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    ({fu.patientId})
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                      fu.status === "Missed"
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : fu.status === "Due Today"
                        ? "bg-amber-50 text-amber-900 border-amber-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {fu.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {t("villageLabel")}: <strong>{fu.village}</strong> • {t("visitType")} <strong>{fu.type}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${fu.phone}`}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors inline-flex items-center gap-1 border border-teal-200"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{t("callPatient")}</span>
                </a>
              </div>
            </div>

            <div className="text-xs text-slate-700 space-y-1">
              <p>
                <strong>{t("scheduledDate")}</strong> {fu.dueDate}
              </p>
              <p>
                <strong>{t("visitAction")}</strong> {fu.actionNeeded}
              </p>
              {fu.reasonIfMissed && (
                <p className="text-rose-700 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-100 w-fit">
                  {t("reasonIfMissed")} {fu.reasonIfMissed}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Updated Today
              </span>

              {fu.status !== "Completed" && (
                <button
                  type="button"
                  onClick={() => handleMarkCompleted(fu.id)}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t("markVisitCompleted")}</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredList.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
            {t("noVisitItemsFound")}
          </div>
        )}
      </div>
    </div>
  );
}
