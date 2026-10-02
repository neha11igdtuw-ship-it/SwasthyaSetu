"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { NavItem } from "@/components/Sidebar";
import { CarePathwayOnboarding } from "@/components/patient/CarePathwayOnboarding";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import { isMaternalCarePathway } from "@/lib/carePathway";
import type { PatientOut } from "@/lib/api/types";
import {
  LayoutDashboard,
  Mic,
  Calendar,
  FileText,
  Share2,
  Stethoscope,
  Pill,
  Clock,
  AlertOctagon,
  FileCheck,
  Building2,
  Loader2,
  MessageSquare,
} from "lucide-react";

const patientNavItems: NavItem[] = [
  { labelKey: "home", defaultLabel: "Home", href: "/patient/dashboard", icon: LayoutDashboard },
  { labelKey: "voice", defaultLabel: "Voice Assistance", href: "/patient/voice-assistant", icon: Mic },
  { labelKey: "appointments", defaultLabel: "Book Appointment", href: "/patient/appointments", icon: Calendar },
  { labelKey: "records", defaultLabel: "My Health Records", href: "/patient/records", icon: FileText },
  { labelKey: "messages", defaultLabel: "Care Team Messages", href: "/patient/messages", icon: MessageSquare },
  { labelKey: "referrals", defaultLabel: "Care Requests", href: "/patient/referrals", icon: Share2 },
  { labelKey: "diagnostics", defaultLabel: "Lab Tests", href: "/patient/diagnostics", icon: Stethoscope },
  { labelKey: "medicines", defaultLabel: "Medicines", href: "/patient/medicines", icon: Pill },
  { labelKey: "followUps", defaultLabel: "Next Visits", href: "/patient/follow-ups", icon: Clock },
  { labelKey: "emergencyHelp", defaultLabel: "Emergency Help", href: "/patient/emergency-help", icon: AlertOctagon },
  { labelKey: "symptoms", defaultLabel: "Tell Symptoms", href: "/patient/symptoms", icon: Mic },
  { labelKey: "uploadReport", defaultLabel: "Upload Records", href: "/patient/documents", icon: FileCheck },
  { labelKey: "nearbyFacilities", defaultLabel: "Nearby Hospitals", href: "/patient/facilities", icon: Building2 },
];

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Loaded from the AUTHENTICATED patient's own backend record
  // (/auth/me + /patients/me) — never from mock/seed data, and never
  // shared across accounts. `patient` starts as `null` and stays that way
  // until the real record has loaded, so no other patient's name,
  // location, or pregnancy data can ever flash on screen first.
  const [patient, setPatient] = useState<PatientOut | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshPatient = useCallback(async () => {
    const me = await loadOwnPatient();
    setPatient(me);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshPatient();
  }, [refreshPatient]);

  const location = patient
    ? [
        patient.village || null,
        isMaternalCarePathway(patient.care_pathway) && patient.pregnancy_week
          ? `Pregnancy W${patient.pregnancy_week}`
          : null,
      ]
        .filter(Boolean)
        .join(" • ") || "Location not set"
    : "Location not set";

  // Onboarding gate: a brand-new patient record has care_pathway = null
  // until they explicitly choose why they're here. Nothing downstream
  // (dashboard, screening, referrals, medicines, etc.) should render for
  // this account until that choice is saved to their real record.
  const needsOnboarding = !loading && patient !== null && !patient.care_pathway;

  return (
    <RequireAuth>
      <AppShell
        role="Patient"
        userName={patient?.full_name || "Your account"}
        facilityOrLocation={location}
        navItems={patientNavItems}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading your account…
          </div>
        ) : needsOnboarding && patient ? (
          <CarePathwayOnboarding
            patient={patient}
            onSelected={(updated) => setPatient(updated)}
          />
        ) : (
          children
        )}
      </AppShell>
    </RequireAuth>
  );
}
