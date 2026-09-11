"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, patientsApi, pregnanciesApi, ApiError } from "@/lib/api/client";
import type { PatientOut, PregnancyOut } from "@/lib/api/types";
import { ShieldAlert, PhoneCall, ArrowRight, Stethoscope, Loader2 } from "lucide-react";

interface HighRiskEntry {
  patient: PatientOut;
  pregnancy: PregnancyOut;
}

export default function HWHighRiskPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<HighRiskEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await authApi.me();
        const patients = await patientsApi.list(me.facility_id ?? undefined);
        const pregnancyLists = await Promise.all(
          patients.map((p) => pregnanciesApi.listForPatient(p.id).catch(() => [] as PregnancyOut[]))
        );
        if (cancelled) return;
        const results: HighRiskEntry[] = [];
        patients.forEach((p, idx) => {
          const active = pregnancyLists[idx].find((pr) => pr.status === "ACTIVE" && pr.risk_level === "HIGH");
          if (active) results.push({ patient: p, pregnancy: active });
        });
        setEntries(results);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load high-risk patients.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={t("highRiskTitle")}
        subtitle={t("highRiskSubtitle")}
        roleBadge={<RoleBadge role="Health Worker" />}
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-950 text-xs font-bold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0" />
          <span>{entries.length} {t("highRiskCountBanner")}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm p-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading real high-risk pregnancies…
        </div>
      ) : entries.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          No high-risk pregnancies currently recorded for this facility.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map(({ patient, pregnancy }) => (
            <div
              key={patient.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{patient.full_name}</h3>
                    <StatusBadge status="High Risk" />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t("villageLabel")}: {patient.village ?? "—"}
                  </span>
                </div>
                {patient.phone && (
                  <a
                    href={`tel:${patient.phone}`}
                    className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 text-teal-800 border border-teal-200"
                    title={t("callPatient")}
                  >
                    <PhoneCall className="w-4 h-4" />
                  </a>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-900/30 border border-rose-100 space-y-1">
                  <span className="font-bold text-rose-900 block">{t("carePriorityReasons")}</span>
                  <p className="text-rose-800 font-medium">
                    Risk flags: {pregnancy.risk_flags || "—"}
                  </p>
                  {pregnancy.notes && <p className="text-rose-800">{pregnancy.notes}</p>}
                </div>

                <div className="p-2.5 rounded-xl bg-teal-50/60 dark:bg-teal-900/30 border border-teal-100 text-teal-900 font-semibold">
                  Expected delivery: {pregnancy.expected_delivery_date ?? "—"} • Gravida {pregnancy.gravida ?? "—"} / Para {pregnancy.para ?? "—"}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/hw/screening/${patient.id}`}
                    className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>{t("check")}</span>
                  </Link>

                  <Link
                    href={`/hw/patients/${patient.id}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors inline-flex items-center gap-1"
                  >
                    <span>{t("openPatientDetails")}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
