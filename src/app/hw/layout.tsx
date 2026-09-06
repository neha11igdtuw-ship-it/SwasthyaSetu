"use client";

import React from "react";
import { AppShell } from "@/components/AppShell";
import { NavItem } from "@/components/Sidebar";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Share2,
  CalendarCheck,
  RefreshCw,
} from "lucide-react";

const hwNavItems: NavItem[] = [
  { label: "Dashboard", href: "/hw/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/hw/patients", icon: Users },
  { label: "High-Risk Cases", href: "/hw/high-risk", icon: AlertTriangle },
  { label: "Referrals", href: "/hw/referrals", icon: Share2 },
  { label: "Follow-ups", href: "/hw/follow-ups", icon: CalendarCheck },
  { label: "Sync Status", href: "/hw/sync", icon: RefreshCw },
];

export default function HealthWorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      role="Health Worker"
      userName="Meena Devi (ASHA)"
      facilityOrLocation="Rampur Sub-Centre • Sector 2"
      navItems={hwNavItems}
      showMobileNav={true}
    >
      {children}
    </AppShell>
  );
}
