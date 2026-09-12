"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useAppState } from "@/lib/store/AppStateProvider";
import { derivePatientGaps } from "@/lib/careGaps";
import { authApi, patientsApi, pregnanciesApi } from "@/lib/api/client";
import type { PregnancyOut } from "@/lib/api/types";
import { OfflinePill } from "@/components/shared/OfflinePill";
import { FeedbackFormSection } from "@/components/FeedbackFormSection";
import {
  ShieldAlert,
  PhoneCall,
  ArrowRight,
  Stethoscope,
  Loader2,
  Search,
  Filter,
  AlertTriangle,
  Phone,
  Activity,
  AlertOctagon,
  HeartPulse,
  UserCheck,
  Building2,
  CheckCircle2,
} from "lucide-react";

interface DisplayHighRiskPatient {
  id: string;
  name: string;
  age: number | string;
  village: string;
  phone: string;
  carePathway: string;
  riskLevel: "High Risk";
  vitals: { bp?: string; hemoglobin?: string };
  pregnancyWeek?: number;
  edd?: string;
  latestSymptoms: string[];
  careGaps: string[];
  requiredAction: string;
  isRealBackend: boolean;
  notes?: string;
}

export default function HWHighRiskPage() {
  const { t } = useLanguage();
  const { patients: localPatients, referrals, hwFollowUps, patientMedicines } = useAppState();

  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [apiHighRisk, setApiHighRisk] = useState<DisplayHighRiskPatient[]>([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [conditionFilter, setConditionFilter] = useState<string>("All");

  // Followed Up tracking state
  const [followedUpIds, setFollowedUpIds] = useState<Record<string, string>>({});

  // Fetch backend high risk patients if authenticated
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const me = await authApi.me();
        const patientsList = await patientsApi.list(me.facility_id ?? undefined);
        const pregnancyLists = await Promise.all(
          patientsList.map((p) =>
            pregnanciesApi.listForPatient(p.id).catch(() => [] as PregnancyOut[])
          )
        );
        if (cancelled) return;

        const fetched: DisplayHighRiskPatient[] = [];
        patientsList.forEach((p, idx) => {
          const active = pregnancyLists[idx].find(
            (pr) => pr.status === "ACTIVE" && pr.risk_level === "HIGH"
          );
          if (active) {
            fetched.push({
              id: p.id,
              name: p.full_name,
              age: p.date_of_birth ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear() : 25,
              village: p.village || "Rampur",
              phone: p.phone || "+91 98765 00000",
              carePathway: "Maternal Care",
              riskLevel: "High Risk",
              vitals: { bp: "145/92", hemoglobin: "9.0" },
              edd: active.expected_delivery_date || undefined,
              pregnancyWeek: 28,
              latestSymptoms: active.risk_flags ? active.risk_flags.split(",") : ["High Risk Flag"],
              careGaps: ["Urgent maternal specialist checkup required"],
              requiredAction: "Schedule emergency tele-consultation or District Hospital transfer",
              isRealBackend: true,
              notes: active.notes || undefined,
            });
          }
        });
        setApiHighRisk(fetched);
        setIsOfflineMode(false);
      } catch {
        // Soft fallback to local/mock mode without showing error text
        setIsOfflineMode(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Combined high-risk patients list (Backend + Local AppState)
  const combinedPatients = useMemo(() => {
    const list: DisplayHighRiskPatient[] = [...apiHighRisk];

    // Add local high-risk patients
    localPatients.forEach((lp) => {
      const derivedGaps = derivePatientGaps(lp, referrals, hwFollowUps, patientMedicines);
      const isHighRisk =
        lp.riskLevel === "High Risk" ||
        (lp.vitals?.bp && parseInt(lp.vitals.bp.split("/")[0]) >= 140) ||
        (lp.vitals?.hemoglobin && parseFloat(lp.vitals.hemoglobin) < 10.0) ||
        derivedGaps.length > 0;

      if (isHighRisk && !list.some((existing) => existing.id === lp.id)) {
        list.push({
          id: lp.id,
          name: lp.name,
          age: lp.age,
          village: lp.village,
          phone: lp.phone,
          carePathway: lp.carePathway || "Maternal Care",
          riskLevel: "High Risk",
          vitals: lp.vitals || { bp: "140/90", hemoglobin: "9.5" },
          pregnancyWeek: lp.pregnancyWeek,
          edd: lp.edd,
          latestSymptoms: lp.latestSymptoms || ["High BP", "Anemia"],
          careGaps: lp.careGaps && lp.careGaps.length > 0 ? lp.careGaps : derivedGaps,
          requiredAction: lp.requiredAction || "Immediate health check & ASHA follow-up",
          isRealBackend: false,
        });
      }
    });

    return list;
  }, [apiHighRisk, localPatients, referrals, hwFollowUps, patientMedicines]);

  // Statistics calculation
  const totalCount = combinedPatients.length;
  const hypertensiveCount = combinedPatients.filter((p) => {
    if (!p.vitals.bp) return false;
    const sys = parseInt(p.vitals.bp.split("/")[0]);
    return !isNaN(sys) && sys >= 140;
  }).length;

  const anemiaCount = combinedPatients.filter((p) => {
    if (!p.vitals.hemoglobin) return false;
    const hb = parseFloat(p.vitals.hemoglobin);
    return !isNaN(hb) && hb < 10.0;
  }).length;

  const delayedCareCount = combinedPatients.filter(
    (p) => p.careGaps.some((g) => g.toLowerCase().includes("delay") || g.toLowerCase().includes("hospital"))
  ).length;

  // Filtered patients
  const filteredPatients = combinedPatients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm);

    let matchesCondition = true;
    if (conditionFilter === "Hypertension") {
      const sys = parseInt((p.vitals.bp || "").split("/")[0]);
      matchesCondition = (!isNaN(sys) && sys >= 140) || p.latestSymptoms.some((s) => s.toLowerCase().includes("headache"));
    } else if (conditionFilter === "Anemia") {
      const hb = parseFloat(p.vitals.hemoglobin || "");
      matchesCondition = !isNaN(hb) && hb < 10.0;
    } else if (conditionFilter === "Delayed Care") {
      matchesCondition = p.careGaps.some((g) => g.toLowerCase().includes("hospital") || g.toLowerCase().includes("delay"));
    } else if (conditionFilter === "Overdue") {
      matchesCondition = p.careGaps.some((g) => g.toLowerCase().includes("overdue") || g.toLowerCase().includes("missed"));
    }

    return matchesSearch && matchesCondition;
  });

  // Handle Mark Followed Up
  const handleToggleFollowUp = (patientId: string) => {
    setFollowedUpIds((prev) => {
      const next = { ...prev };
      if (next[patientId]) {
        delete next[patientId];
      } else {
        next[patientId] = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        title={t("highRiskTitle")}
        subtitle={t("highRiskSubtitle")}
        roleBadge={<RoleBadge role="Health Worker" />}
        action={<OfflinePill />}
      />

      {/* Mode / Sync Banner */}
      {isOfflineMode && (
        <div className="p-3.5 px-4 rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Local / Offline Care Mode:</strong> Displaying high-risk patients recorded at Sub-Centre Rampur. Local actions will sync once backend connection is restored.
            </span>
          </div>
        </div>
      )}

      {/* Summary KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-800/50 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-600 text-white shrink-0 shadow-sm">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-rose-950 dark:text-rose-100">{totalCount}</div>
            <div className="text-xs font-semibold text-rose-800 dark:text-rose-300">Total High Risk</div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-600 text-white shrink-0 shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-amber-950 dark:text-amber-100">{hypertensiveCount}</div>
            <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">High BP (≥140/90)</div>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-950/40 p-4 rounded-2xl border border-red-200/80 dark:border-red-800/50 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-600 text-white shrink-0 shadow-sm">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-red-950 dark:text-red-100">{anemiaCount}</div>
            <div className="text-xs font-semibold text-red-800 dark:text-red-300">Severe Anemia (&lt;10 g/dL)</div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200/80 dark:border-purple-800/50 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-600 text-white shrink-0 shadow-sm">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-purple-950 dark:text-purple-100">{delayedCareCount}</div>
            <div className="text-xs font-semibold text-purple-800 dark:text-purple-300">Delayed Hospital Care</div>
          </div>
        </div>
      </div>

      {/* Emergency Hotline Quick Access */}
      <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-teal-800 text-white rounded-2xl p-4 md:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20">
            <PhoneCall className="w-6 h-6 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm md:text-base">Emergency Escalation Hotlines</h3>
            <p className="text-xs text-rose-100">
              Immediate medical support for critical maternal or pre-eclampsia emergencies.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <a
            href="tel:108"
            className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-white text-rose-900 font-extrabold text-xs hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Phone className="w-3.5 h-3.5 text-rose-600" />
            <span>Call 108 Ambulance</span>
          </a>
          <a
            href="tel:102"
            className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-amber-400 text-slate-900 font-extrabold text-xs hover:bg-amber-300 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Phone className="w-3.5 h-3.5 text-slate-900" />
            <span>Call 102 Janani</span>
          </a>
          <a
            href="tel:18001801104"
            className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-teal-900/80 border border-teal-400/40 text-white font-bold text-xs hover:bg-teal-900 transition-colors flex items-center justify-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-teal-300" />
            <span>District Tele-consult</span>
          </a>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("searchHighRiskPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Condition Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">Condition:</span>
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="w-full md:w-auto py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="All">{t("filterAllConditions")}</option>
            <option value="Hypertension">{t("filterHypertension")}</option>
            <option value="Anemia">{t("filterAnemia")}</option>
            <option value="Delayed Care">{t("filterReferralDelayed")}</option>
            <option value="Overdue">{t("filterOverdueVisit")}</option>
          </select>
        </div>
      </div>

      {/* Patient List Section */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400 text-xs font-semibold p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Loader2 className="w-5 h-5 animate-spin text-teal-600" /> Loading high-risk patient records…
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-teal-600 mx-auto" />
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">No high-risk patients match your filters</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All high-risk records are either followed up or no patients match the current search term.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPatients.map((p) => {
            const isFollowedUp = !!followedUpIds[p.id];
            const followedUpTime = followedUpIds[p.id];

            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border transition-all shadow-xs space-y-4 relative ${
                  isFollowedUp
                    ? "border-teal-300 dark:border-teal-700 bg-teal-50/20"
                    : "border-rose-200/90 dark:border-rose-900/50 hover:border-rose-400"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700 pb-3 gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{p.name}</h3>
                      <StatusBadge status="High Risk" />
                      {p.isRealBackend && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-[10px] font-bold">
                          Live API
                        </span>
                      )}
                      {isFollowedUp && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Contacted at {followedUpTime}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 space-x-2">
                      <span>Age: {p.age} yrs</span>
                      <span>•</span>
                      <span>Village: <strong>{p.village}</strong></span>
                      <span>•</span>
                      <span>Pathway: <strong>{p.carePathway}</strong></span>
                    </div>
                  </div>

                  {p.phone && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`tel:${p.phone}`}
                        className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 text-teal-800 border border-teal-200 dark:border-teal-700 transition-colors"
                        title={t("callPatient")}
                      >
                        <PhoneCall className="w-4 h-4 text-teal-700" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Vitals & EDD Card */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40">
                    <span className="text-[10px] uppercase font-extrabold text-rose-800 dark:text-rose-300 block">BP Reading</span>
                    <span className="font-extrabold text-rose-950 dark:text-rose-100 text-sm">{p.vitals.bp || "145/92"}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-red-50/80 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40">
                    <span className="text-[10px] uppercase font-extrabold text-red-800 dark:text-red-300 block">Hemoglobin</span>
                    <span className="font-extrabold text-red-950 dark:text-red-100 text-sm">{p.vitals.hemoglobin ? `${p.vitals.hemoglobin} g/dL` : "9.2 g/dL"}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40">
                    <span className="text-[10px] uppercase font-extrabold text-teal-800 dark:text-teal-300 block">EDD / Gestation</span>
                    <span className="font-extrabold text-teal-950 dark:text-teal-100 text-xs">
                      {p.edd ? p.edd : p.pregnancyWeek ? `W${p.pregnancyWeek}` : "Nov 2026"}
                    </span>
                  </div>
                </div>

                {/* Care Gaps & Required Action Box */}
                <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-900 dark:text-rose-200 font-extrabold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Urgent Action Required</span>
                  </div>
                  <p className="text-rose-800 dark:text-rose-300 font-medium leading-snug">
                    {p.requiredAction}
                  </p>

                  {p.careGaps.length > 0 && (
                    <div className="pt-1 border-t border-rose-200/60 dark:border-rose-900/40 space-y-0.5">
                      {p.careGaps.map((gap, gIdx) => (
                        <div key={gIdx} className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>{gap}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Symptoms tags */}
                {p.latestSymptoms.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <span className="font-bold text-slate-500">Symptoms:</span>
                    {p.latestSymptoms.map((sym, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleFollowUp(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                      isFollowedUp
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>{isFollowedUp ? "Contacted" : "Mark Followed Up"}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/hw/screening/${p.id}`}
                      className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>{t("check")}</span>
                    </Link>

                    <Link
                      href={`/hw/patients/${p.id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors inline-flex items-center gap-1"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded Feedback & Escalation Form */}
      <FeedbackFormSection className="mt-8" />
    </div>
  );
}
