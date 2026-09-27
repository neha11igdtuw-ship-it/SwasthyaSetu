import React from "react";
import { AlertOctagon, PhoneCall, ShieldAlert, MapPin } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

/**
 * Maternal-care-only emergency card: pregnancy danger-signs framing, the
 * ASHA/ANM community contact line, and maternal emergency copy. Callers
 * MUST only render this when `isMaternalCarePathway(patient.care_pathway)`
 * is true — never mount it for a general/child/chronic/emergency/other
 * patient, even hidden behind CSS. See GeneralEmergencyHelpCard for the
 * non-maternal equivalent.
 */
interface EmergencyHelpCardProps {
  ashaPhone: string;
  onTriggerAlert?: () => void;
}

export function EmergencyHelpCard({ ashaPhone, onTriggerAlert }: EmergencyHelpCardProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-rose-950 text-white rounded-2xl p-6 shadow-md space-y-4 border border-rose-800">
      <div className="flex items-center gap-3 border-b border-rose-800 pb-3">
        <div className="w-10 h-10 rounded-xl bg-rose-800 text-rose-100 flex items-center justify-center font-bold">
          <AlertOctagon className="w-6 h-6 animate-bounce text-rose-300" />
        </div>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-300 block">
            {t("emergencyProtocolTitle")}
          </span>
          <h3 className="font-extrabold text-lg text-white">
            {t("maternalDangerSignsTitle")}
          </h3>
        </div>
      </div>

      <p className="text-xs text-rose-100 leading-relaxed">
        {t("aiPreliminaryNotice")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <a
          href={`tel:${ashaPhone}`}
          onClick={onTriggerAlert}
          className="p-3 rounded-xl bg-rose-800 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 border border-rose-600 transition-colors"
        >
          <PhoneCall className="w-4 h-4" />
          <span>{t("callASHA")} ({ashaPhone})</span>
        </a>

        <a
          href="tel:108"
          onClick={onTriggerAlert}
          className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 border border-rose-400 transition-colors"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Call Ambulance (108)</span>
        </a>

        <a
          href="/patient/facilities"
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
        >
          <MapPin className="w-4 h-4 text-rose-400" />
          <span>{t("viewHospitalDetails")}</span>
        </a>
      </div>

      <p className="text-[10px] text-rose-300 italic text-center">
        Tapping a call button logs an in-app emergency alert to your care team. Only the phone
        dial itself depends on your device&apos;s actual telephony and cannot be simulated here.
      </p>
    </div>
  );
}

/**
 * Non-maternal equivalent of EmergencyHelpCard — no pregnancy/ASHA framing
 * at all, and never a seeded/demo name. Ambulance (108) is a public
 * national emergency number available to everyone, so it's always shown;
 * the personal-contact button only appears when this patient has actually
 * saved one, and is never backed by a placeholder name or number.
 */
interface GeneralEmergencyHelpCardProps {
  emergencyContact: string | null;
  onTriggerAlert?: () => void;
}

export function GeneralEmergencyHelpCard({ emergencyContact, onTriggerAlert }: GeneralEmergencyHelpCardProps) {
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
        If you&apos;re facing a medical emergency, call an ambulance or your emergency contact
        immediately.
      </p>

      <div className={`grid grid-cols-1 ${emergencyContact ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3 pt-2`}>
        {emergencyContact && (
          <a
            href={`tel:${emergencyContact}`}
            onClick={onTriggerAlert}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 border border-slate-600 transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call emergency contact ({emergencyContact})</span>
          </a>
        )}

        <a
          href="tel:108"
          onClick={onTriggerAlert}
          className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 border border-rose-400 transition-colors"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Call Ambulance (108)</span>
        </a>

        <a
          href="/patient/facilities"
          className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 border border-slate-600 transition-colors"
        >
          <MapPin className="w-4 h-4 text-rose-400" />
          <span>Nearby hospitals</span>
        </a>
      </div>

      {!emergencyContact && (
        <p className="text-[10px] text-slate-400 italic text-center">
          Add an emergency contact from My Health Records so it shows up here.
        </p>
      )}
    </div>
  );
}
