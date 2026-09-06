"use client";

import React from "react";
import { priyaPatientMock } from "@/lib/mockData";
import { PatientHeader } from "@/components/patient/PatientHeader";
import { LastSyncedBadge } from "@/components/patient/LastSyncedBadge";
import { CareStatusCard } from "@/components/care/CareStatusCard";
import { NextActionCard } from "@/components/care/NextActionCard";
import { ReferralStatusStepper } from "@/components/care/ReferralStatusStepper";
import { FollowUpCard } from "@/components/care/FollowUpCard";
import { VoiceAssistantCard } from "@/components/patient/VoiceAssistantCard";
import { QuickActionCard } from "@/components/patient/QuickActionCard";
import { EmergencyHelpCard } from "@/components/patient/EmergencyHelpCard";
import { useLanguage } from "@/lib/i18n/languageContext";
import {
  Mic,
  Calendar,
  Upload,
  Share2,
  Stethoscope,
  Pill,
  AlertOctagon,
  Share2 as ShareIcon,
} from "lucide-react";

export default function PatientDashboardPage() {
  const p = priyaPatientMock;
  const { t } = useLanguage();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Patient Header & Offline Badge */}
      <div className="space-y-3">
        <PatientHeader
          name={p.profile.name}
          location={p.profile.location}
          language={p.profile.selectedLanguage}
          pregnancyWeek={p.profile.pregnancyWeek}
        />
        <div className="flex justify-end">
          <LastSyncedBadge lastSyncedText="Today at 9:30 AM" />
        </div>
      </div>

      {/* Voice Assistant Hero Banner */}
      <VoiceAssistantCard />

      {/* Grid: Care Status & Next Action */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CareStatusCard
          label={p.careStatus.label}
          riskStatus={p.careStatus.riskStatus}
          reasons={p.careStatus.reasons}
          disclaimer={p.careStatus.disclaimer}
        />

        <NextActionCard
          recommendedAction={p.nextAction.recommendedAction}
          recommendedFacility={p.nextAction.recommendedFacility}
          facilityType={p.nextAction.facilityType}
          distance={p.nextAction.distance}
          availableServices={p.nextAction.availableServices}
          doctorAvailability={p.nextAction.doctorAvailability}
          lastUpdated={p.nextAction.lastUpdated}
          isLive={p.nextAction.isLive}
        />
      </div>

      {/* Referral Progress Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShareIcon className="w-5 h-5 text-teal-700" />
            <h3 className="font-extrabold text-slate-900 text-base">
              {t("activeCareRequestProgress")}
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
            {t("stepAccepted")}
          </span>
        </div>

        <ReferralStatusStepper steps={p.referral.steps} />
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-slate-900 text-lg">
          {t("quickActionsHeading")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title={t("voiceAssistance")}
            subtitle={t("askVoiceAssistant")}
            href="/patient/voice-assistant"
            icon={Mic}
            badgeText="Voice"
            accentColor="amber"
          />
          <QuickActionCard
            title={t("bookAppointment")}
            subtitle="Schedule doctor visit"
            href="/patient/appointments"
            icon={Calendar}
            accentColor="teal"
          />
          <QuickActionCard
            title={t("uploadReport")}
            subtitle="Scan lab tests or ANC card"
            href="/patient/documents"
            icon={Upload}
            accentColor="indigo"
          />
          <QuickActionCard
            title={t("viewCareRequest")}
            subtitle="Check hospital progress"
            href="/patient/referrals"
            icon={Share2}
            accentColor="teal"
          />
          <QuickActionCard
            title={t("viewLabTests")}
            subtitle="Recommended health tests"
            href="/patient/diagnostics"
            icon={Stethoscope}
            accentColor="teal"
          />
          <QuickActionCard
            title={t("viewMedicines")}
            subtitle="Dosage & nearby stock"
            href="/patient/medicines"
            icon={Pill}
            accentColor="teal"
          />
          <QuickActionCard
            title={t("emergencyHelp")}
            subtitle="Immediate high-risk alert"
            href="/patient/emergency-help"
            icon={AlertOctagon}
            badgeText={t("highRisk")}
            accentColor="rose"
          />
        </div>
      </div>

      {/* Upcoming Follow-up Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-base">
          {t("upcomingFollowUpPriority")}
        </h3>
        <FollowUpCard item={p.followUps[0]} />
      </div>

      {/* Emergency Help Protocol Banner */}
      <EmergencyHelpCard ashaPhone={p.profile.assignedASHAPhone} />
    </div>
  );
}
