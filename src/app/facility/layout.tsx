"use client";

import React from "react";
import { AppShell } from "@/components/AppShell";
import { NavItem } from "@/components/Sidebar";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Activity,
  Package,
  FileBarChart,
} from "lucide-react";

const facilityNavItems: NavItem[] = [
  { label: "Dashboard", href: "/facility/dashboard", icon: LayoutDashboard },
  { label: "Incoming Referrals", href: "/facility/referrals", icon: Inbox },
  { label: "Patients", href: "/facility/patients", icon: Users },
  { label: "Services", href: "/facility/services", icon: Activity },
  { label: "Availability", href: "/facility/availability", icon: Package },
  { label: "Reports", href: "/facility/reports", icon: FileBarChart },
];

export default function FacilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      role="Healthcare Facility"
      userName="Admin Desk (District Hospital)"
      facilityOrLocation="District Civil Hospital & Maternal Care Centre"
      navItems={facilityNavItems}
      showMobileNav={true}
    >
      {children}
    </AppShell>
  );
}
