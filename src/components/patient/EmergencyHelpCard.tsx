import React from "react";
import Link from "next/link";
import { AlertOctagon, PhoneCall, ShieldAlert, MapPin } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

/**
 * The three emergency actions every patient needs, shared by the maternal and
 * general cards below so the two can never drift apart:
 *   1. Call 108 (national ambulance number — a public number, not patient data)
 *   2. Contact ANM / health worker — ONLY the signed-in patient's own saved
 *      emergency contact. If none is saved we show a neutral message; we never
 *      substitute a seeded/demo or placeholder number.
 *   3. Find a nearby facility (existing /patient/facilities nearby logic).
 */
interface EmergencyActionsProps {
  emergencyContact: string | null;
  onTriggerAlert?: () => void;
  tone: "rose" | "slate";
}

function EmergencyActions({ emergencyContact, onTriggerAlert, tone }: EmergencyActionsProps) {
  const base =
    "min-h-14 p-3 rounded-xl text-white text-sm font-extrabold flex items-center justify-center gap-2 border transition-colors text-center";
  const secondary =
    tone === "rose"
      ? "bg-rose-800 hover:bg-rose-700 border-rose-600"
      : "bg-slate-800 hover:bg-slate-700 border-slate-600";
  const noteColor = tone === "rose" ? "text-rose-200" : "text-slate-300";

  return (
    <div className="space-y-3 pt-2">
      <a
        href="tel:108"
        onClick={onTriggerAlert}
        className={`${base} bg-rose-600 hover:bg-rose-500 border-rose-400 text-base`}
      >
        <ShieldAlert className="w-5 h-5" />
        <span>1. Call 108 (Ambulance)</span>
      </a>

      {emergencyContact ? (
        <a
          href={`tel:${emergencyContact}`}
          onClick={onTriggerAlert}
          className={`${base} ${secondary}`}
        >
          <PhoneCall className="w-5 h-5" />
          <span>2. Contact ANM / Health Worker ({emergencyContact})</span>
        </a>
      ) : (
        <div className={`${base} ${secondary} opacity-80 flex-col gap-0.5`}>
          <span>2. Contact ANM / Health Worker</span>
          <span className={`text-xs font-semibold ${noteColor}`}>No emergency contact added.</span>
        </div>
      )}

      <Link href="/patient/facilities" className={`${base} bg-slate-900 hover:bg-slate-800 border-slate-700`}>
        <MapPin className="w-5 h-5 text-rose-400" />
        <span>3. Find a nearby facility</span>
      </Link>

      {!emergencyContact && (
        <p className={`text-[11px] italic text-center ${noteColor}`}>
          Add an emergency contact from My Health Records so it shows up here.
        </p>
      )}
    </div>
  );
}

/**
 * Maternal-care-only emergency card: pregnancy danger-signs framing. Callers
 * MUST only render this when `isMaternalCarePathway(patient.care_pathway)` is
 * true (the patient's persisted pathway) — never mount it for a
 * general/child/chronic/emergency/other patient, even hidden behind CSS. See
 * GeneralEmergencyHelpCard for the non-maternal equivalent.
 */
interface EmergencyHelpCardProps {
  emergencyContact: string | null;
  onTriggerAlert?: () => void;
}

export function EmergencyHelpCard({ emergencyContact, onTriggerAlert }: EmergencyHelpCardProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-rose-950 text-white rounded-2xl p-6 shadow-md space-y-4 border border-rose-800">
      <div className="flex items-center gap-3 border-b border-rose-800 pb-3">
        <div className="w-10 h-10 rounded-xl bg-rose-800 text-rose-100 flex items-center justify-center font-bold">
          <AlertOctagon className="w-6 h-6 text-rose-300" />
        </div>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-300 block">
            {t("emergencyProtocolTitle")}
          </span>
          <h3 className="font-extrabold text-lg text-white">{t("maternalDangerSignsTitle")}</h3>
        </div>
      </div>

      <p className="text-xs text-rose-100 leading-relaxed">{t("aiPreliminaryNotice")}</p>

      <EmergencyActions emergencyContact={emergencyContact} onTriggerAlert={onTriggerAlert} tone="rose" />

      <p className="text-[10px] text-rose-300 italic text-center">
        Tapping a call button logs an in-app emergency alert to your care team. Only the phone
        dial itself depends on your device&apos;s actual telephony and cannot be simulated here.
      </p>
    </div>
  );
}

/**
 * Non-maternal equivalent of EmergencyHelpCard — no pregnancy framing at all,
 * and never a seeded/demo name or number.
 */
interface GeneralEmergencyHelpCardProps {
  emergencyContact: string | null;
  onTriggerAlert?: () => void;
}

export function GeneralEmergencyHelpCard({
  emergencyContact,
  onTriggerAlert,
}: GeneralEmergencyHelpCardProps) {
  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4 border border-slate-700">
      <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
        <div className="w-10 h-10 rounded-xl bg-rose-800 text-rose-100 flex items-center justify-center font-bold">
          <AlertOctagon className="w-6 h-6 text-rose-300" />
        </div>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
            EMERGENCY HELP
          </span>
          <h3 className="font-extrabold text-lg text-white">Need urgent help right now?</h3>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        If you&apos;re facing a medical emergency, call an ambulance or your health worker
        immediately.
      </p>

      <EmergencyActions emergencyContact={emergencyContact} onTriggerAlert={onTriggerAlert} tone="slate" />
    </div>
  );
}
