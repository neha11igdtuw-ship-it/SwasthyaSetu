"use client";

import React from "react";
import { AppShell } from "@/components/AppShell";
import { NavItem } from "@/components/Sidebar";
import {
  LayoutDashboard,
  UserPlus,
  Stethoscope,
  Users,
  Share2,
  AlertTriangle,
  Clock,
  RefreshCw,
} from "lucide-react";

const hwNavItems: NavItem[] = [
  { labelKey: "hwDashboard", defaultLabel: "Dashboard", href: "/hw/dashboard", icon: LayoutDashboard },
  { labelKey: "hwPatients", defaultLabel: "My patients", href: "/hw/patients", icon: Users },
  { labelKey: "hwRegister", defaultLabel: "Register patient", href: "/hw/patients/register", icon: UserPlus },
  { labelKey: "hwScreening", defaultLabel: "Health check", href: "/hw/screening/P-7821", icon: Stethoscope },
  { labelKey: "hwHighRisk", defaultLabel: "Patients needing urgent attention", href: "/hw/high-risk", icon: AlertTriangle },
  { labelKey: "hwReferrals", defaultLabel: "New care requests", href: "/hw/referrals", icon: Share2 },
  { labelKey: "hwFollowUps", defaultLabel: "Visits due & missed", href: "/hw/follow-ups", icon: Clock },
  { labelKey: "hwUpdateInfo", defaultLabel: "Update information", href: "/hw/sync", icon: RefreshCw },
];

export default function HealthWorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      role="Health Worker"
      userName="Sunita Devi"
      facilityOrLocation="Sub-Centre Rampur"
      navItems={hwNavItems}
    >
      {children}
    </AppShell>
  );
}
