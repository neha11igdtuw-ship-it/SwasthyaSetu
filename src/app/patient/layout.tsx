"use client";

import React from "react";
import { AppShell } from "@/components/AppShell";
import { NavItem } from "@/components/Sidebar";
import {
  LayoutDashboard,
  Mic,
  FileText,
  Share2,
  Calendar,
  Settings,
} from "lucide-react";

const patientNavItems: NavItem[] = [
  { label: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
  { label: "Symptoms", href: "/patient/symptoms", icon: Mic },
  { label: "Records", href: "/patient/records", icon: FileText },
  { label: "Referrals", href: "/patient/referrals", icon: Share2 },
  { label: "Follow-ups", href: "/patient/follow-ups", icon: Calendar },
  { label: "Settings", href: "/patient/settings", icon: Settings },
];

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      role="Patient"
      userName="Sunita Devi"
      facilityOrLocation="Rampur Village • Sub-Centre Area 2"
      navItems={patientNavItems}
      showMobileNav={true}
    >
      {children}
    </AppShell>
  );
}
