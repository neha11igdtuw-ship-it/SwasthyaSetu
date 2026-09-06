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
  { labelKey: "hwDashboard", defaultLabel: "Overview", href: "/hw/dashboard", icon: LayoutDashboard },
  { labelKey: "hwRegister", defaultLabel: "Register Person", href: "/hw/patients/register", icon: UserPlus },
  { labelKey: "hwTriage", defaultLabel: "Initial Health Check", href: "/hw/screening/P-7821", icon: Stethoscope },
  { labelKey: "hwRecords", defaultLabel: "People Records", href: "/hw/patients", icon: Users },
  { labelKey: "hwReferrals", defaultLabel: "Care Requests", href: "/hw/referrals", icon: Share2 },
  { labelKey: "hwHighRisk", defaultLabel: "High Priority Cases", href: "/hw/high-risk", icon: AlertTriangle },
  { labelKey: "followUps", defaultLabel: "Next Visits", href: "/hw/follow-ups", icon: Clock },
  { labelKey: "hwSync", defaultLabel: "Device Records", href: "/hw/sync", icon: RefreshCw },
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
