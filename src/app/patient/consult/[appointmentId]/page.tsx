"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { TeleconsultRoom } from "@/components/care/TeleconsultRoom";
import { useLanguage } from "@/lib/i18n/languageContext";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function PatientConsultPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const params = useParams<{ appointmentId: string }>();
  const appointmentId = params?.appointmentId ?? "";

  const [displayName, setDisplayName] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patient = await loadOwnPatient();
        if (!cancelled) setDisplayName(patient?.full_name ?? undefined);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load your profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={t("videoConsult")}
        subtitle={t("appointmentId") + ": " + appointmentId.slice(0, 8)}
        roleBadge={<RoleBadge role="Patient" />}
        action={
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("back")}
          </button>
        }
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t("teleconsultLoading")}</span>
        </div>
      ) : (
        <TeleconsultRoom appointmentId={appointmentId} displayName={displayName} preferredLanguage={language} />
      )}
    </div>
  );
}
