"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { FollowUpCard } from "@/components/care/FollowUpCard";
import type { FollowUpItem } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import { careGapsApi } from "@/lib/api/client";
import type { CareGapOut, SupportRequestOut } from "@/lib/api/types";
import { HelpCircle, Loader2, CalendarCheck, CheckCircle2 } from "lucide-react";
import { SupportRequestModal } from "@/components/support/SupportRequestModal";
import { SupportRequestStatusBadge } from "@/components/support/SupportRequestStatusBadge";

// Map a real backend CareGapOut (the actual "next visit / follow-up due"
// record for THIS patient) onto the shape FollowUpCard already knows how
// to render. No mock/seed data involved.
function toFollowUpItem(gap: CareGapOut): FollowUpItem {
  const typeMap: Record<string, FollowUpItem["type"]> = {
    MEDICINE: "Medicine",
    DIAGNOSTIC: "Diagnostic",
    ASHA_VISIT: "ASHA Visit",
    DOCTOR_VISIT: "Doctor Visit",
  };

  return {
    id: gap.id,
    title: gap.description || gap.gap_type.replace(/_/g, " "),
    type: typeMap[gap.gap_type.toUpperCase()] || "Doctor Visit",
    dueDate: gap.due_date || "Not scheduled",
    status: gap.status === "CLOSED" ? "Completed" : "Due",
    instructions: gap.description || "",
  };
}

export default function PatientFollowUpsPage() {
  const { t } = useLanguage();
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<SupportRequestOut | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Real, per-patient care gaps for the AUTHENTICATED patient's own
      // record only (never another account's, never seeded demo data).
      const me = await loadOwnPatient();
      if (!me) {
        setFollowUps([]);
        return;
      }
      const gaps = await careGapsApi.listForPatient(me.id);
      setFollowUps(gaps.map(toFollowUpItem));
    } catch (err) {
      console.warn("patient/follow-ups: failed to load real follow-ups", err);
      setFollowUps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // NOTE: there is currently no backend endpoint to mark a care gap as
  // closed from the patient side, so this only updates local UI state
  // (optimistic) — it does not fabricate or persist fake completion data.
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

      {submittedRequest && (
        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
            Your support request was sent to your care team.
            <SupportRequestStatusBadge status={submittedRequest.status} />
          </span>
          <button
            type="button"
            onClick={() => setSubmittedRequest(null)}
            className="text-[10px] underline font-bold cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <SupportRequestModal
        open={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        onSubmitted={(req) => {
          setSubmittedRequest(req);
          setSupportModalOpen(false);
        }}
      />

      {/* Follow-ups List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
            {t("upcomingScheduledVisits")}
          </h3>
          <button
            type="button"
            onClick={() => setSupportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors inline-flex items-center gap-1 border border-amber-300 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-700" />
            <span>{t("getSupportTitle")}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14 text-slate-500 gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading your follow-ups…
          </div>
        ) : followUps.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
            <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              No follow-ups scheduled
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Any medicine refills, tests, or visits a health worker schedules for you will show up here.
            </p>
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
