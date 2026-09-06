"use client";

import React from "react";
import { AppShell } from "@/components/AppShell";
import { NavItem } from "@/components/Sidebar";
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
} from "lucide-react";

const patientNavItems: NavItem[] = [
  { labelKey: "home", defaultLabel: "Home", href: "/patient/dashboard", icon: LayoutDashboard },
  { labelKey: "voice", defaultLabel: "Voice Assistance", href: "/patient/voice-assistant", icon: Mic },
  { labelKey: "appointments", defaultLabel: "Book Appointment", href: "/patient/appointments", icon: Calendar },
  { labelKey: "records", defaultLabel: "My Health Records", href: "/patient/records", icon: FileText },
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
  return (
    <AppShell
      role="Patient"
      userName="Priya Sharma"
      facilityOrLocation="Rampur Village • Pregnancy W28"
      navItems={patientNavItems}
    >
      {children}
    </AppShell>
  );
}
