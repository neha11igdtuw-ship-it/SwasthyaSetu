"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { FollowUpCard } from "@/components/care/FollowUpCard";
import type { FollowUpItem } from "@/lib/mockData";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import { appointmentsApi } from "@/lib/api/client";
import { useLanguage } from "@/lib/i18n/languageContext";
import { HelpCircle, Loader2 } from "lucide-react";

export default function PatientFollowUpsPage() {
  const { t } = useLanguage();
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [needHelp, setNeedHelp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await loadOwnPatient();
      if (!me) {
        setLoading(false);
        return;
      }
      // Real, per-patient data only — no mock/demo follow-ups are ever
      // shown for an authenticated patient. If there's nothing scheduled,
      // the empty state below is shown instead.
      const appointments = await appointmentsApi.me().catch(() => []);
      if (cancelled) return;
      const upcoming = appointments
        .filter((a) => a.status === "SCHEDULED")
        .map(
          (a): FollowUpItem => ({
            id: a.id,
            title: a.reason || "Scheduled visit",
            type: "Doctor Visit",
            dueDate: new Date(a.scheduled_at).toLocaleDateString(),
            status: "Due",
            instructions: a.reason || "Please attend this scheduled visit.",
          })
        );
      setFollowUps(upcoming);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMarkCompleted = (id: string) => {
    setFollowUps((prev) =>
      prev.map((fu) => (fu.id === id ? { ...fu, status: "Completed" } : fu))
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="upcomingFollowUpPriority"
        subtitle="medicinesSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      {needHelp && (
        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center justify-between">
          <span>{t("referralUpdateSent")}</span>
          <button
            type="button"
            onClick={() => setNeedHelp(false)}
            className="text-[10px] underline font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Follow-ups List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
            {t("upcomingScheduledVisits")}
          </h3>
          <button
            type="button"
            onClick={() => setNeedHelp(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors inline-flex items-center gap-1 border border-amber-300 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-700" />
            <span>{t("getSupportTitle")}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("loadingYourAccount")}
          </div>
        ) : followUps.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center text-sm text-slate-500">
            {t("noFollowUpsYet")}
          </div>
        ) : (
          followUps.map((item) => (
            <FollowUpCard
              key={item.id}
              item={item}
              onMarkCompleted={handleMarkCompleted}
            />
          ))
        )}
      </div>
    </div>
  );
}
